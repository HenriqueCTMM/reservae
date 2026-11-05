const pool = require('../config/database');
const Availability = require('../models/availability');
const { getRestaurantDateTime, isDate, isTime, timeToMinutes, minutesToTime } = require('../utils/dateTime');
const { getReservationDurationMinutes, getAllowedSlots } = require('../utils/reservationRules');

function validateReservation(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)
        || Object.keys(data).some((field) => !['mesaId', 'data', 'horario', 'pessoas'].includes(field))) {
        return 'Envie apenas mesaId, data, horario e pessoas em um objeto JSON.';
    }
    if (typeof data.mesaId !== 'string' || !/^[1-9]\d{0,9}$/.test(data.mesaId.trim())
        || Number(data.mesaId) > 4294967295) {
        return 'Informe um ID de mesa válido em texto.';
    }
    if (typeof data.data !== 'string' || !isDate(data.data.trim())) {
        return 'Informe uma data real em YYYY-MM-DD.';
    }
    if (typeof data.horario !== 'string' || !isTime(data.horario.trim())) {
        return 'Informe um horário real em HH:mm.';
    }
    if (!Number.isInteger(data.pessoas) || data.pessoas < 1 || data.pessoas > 8) {
        return 'Informe uma quantidade inteira de 1 a 8 pessoas.';
    }
    return '';
}

function publicReservation(reservation) {
    return {
        ...reservation,
        id: String(reservation.id), usuarioId: String(reservation.usuarioId), mesaId: String(reservation.mesaId),
        createdAt: Number(reservation.createdAt),
        statusUpdatedAt: reservation.statusUpdatedAt === null ? null : Number(reservation.statusUpdatedAt),
        statusUpdatedBy: reservation.statusUpdatedBy === null ? null : String(reservation.statusUpdatedBy)
    };
}

module.exports = function createReservationController(Reservation) {
    return {
        async getMyReservations(req, res, next) {
            // Conferir o transporte também rejeita {} e corpos que não sejam JSON.
            if (Object.keys(req.query).length
                || req.get('Transfer-Encoding') !== undefined || Number(req.get('Content-Length') || 0) > 0) {
                return res.status(400).json({ message: 'A consulta de suas reservas não aceita filtros ou dados no corpo.' });
            }
            try {
                const reservations = await Reservation.findByUser(req.user.id);
                res.json(reservations.map(publicReservation));
            } catch (error) {
                next(error);
            }
        },
        async createReservation(req, res, next) {
            if (Object.keys(req.query).length) {
                return res.status(400).json({ message: 'A criação de reserva não aceita parâmetros de consulta.' });
            }
            const message = validateReservation(req.body);
            if (message) return res.status(400).json({ message });
            const data = {
                usuarioId: req.user.id, mesaId: req.body.mesaId.trim(), data: req.body.data.trim(),
                horario: req.body.horario.trim(), pessoas: req.body.pessoas
            };

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                // Primeira leitura: a mesma trava usada pelas alterações de mesas e funcionamento.
                await Reservation.lockSettings(connection);
                const table = await Reservation.findTableForUpdate(data.mesaId, connection);
                if (!table) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Mesa não encontrada.' });
                }
                const schedule = await Availability.findSchedule(data.data, connection);
                data.duracaoMinutos = getReservationDurationMinutes(data.pessoas);
                // Recalcular o relógio depois da espera pela trava, nunca usar o instante do pedido.
                const now = getRestaurantDateTime();
                if (data.data < now.slice(0, 10)
                    || !getAllowedSlots(data.data, schedule, data.duracaoMinutos, now).includes(data.horario)) {
                    await connection.rollback();
                    return res.status(400).json({ message: 'O período não atende ao funcionamento ou à antecedência mínima de 3 horas. Escolha outro horário.' });
                }
                if (table.status !== 'disponivel' || table.capacidade < data.pessoas) {
                    await connection.rollback();
                    return res.status(409).json({ message: 'A mesa está indisponível ou não comporta a quantidade de pessoas. Escolha outra mesa.' });
                }
                data.fimPrevisto = minutesToTime(timeToMinutes(data.horario) + data.duracaoMinutos);
                if (await Reservation.hasConflict(data, connection)) {
                    await connection.rollback();
                    return res.status(409).json({ message: 'A mesa selecionada já possui reserva neste período. Escolha outra mesa ou horário.' });
                }
                const id = await Reservation.create(data, connection);
                const reservation = await Reservation.findById(id, connection);
                await connection.commit();
                res.status(201).json(publicReservation(reservation));
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        }
    };
};
