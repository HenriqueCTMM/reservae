const pool = require('../config/database');
const Availability = require('../models/availability');
const { getRestaurantDateTime, isDate, isTime, timeToMinutes, minutesToTime } = require('../utils/dateTime');
const { getReservationDurationMinutes, getAllowedSlots } = require('../utils/reservationRules');
const { publicReservation } = require('../utils/reservationResponse');
const RESERVATION_STATUSES = ['ativa', 'finalizada', 'cancelada', 'nao_compareceu'];

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

module.exports = function createReservationController(Reservation) {
    return {
        async getReservations(req, res, next) {
            if (Object.keys(req.query).some((field) => !['data', 'status', 'search'].includes(field))
                || Object.values(req.query).some((value) => typeof value !== 'string')
                || req.get('Transfer-Encoding') !== undefined || Number(req.get('Content-Length') || 0) > 0) {
                return res.status(400).json({ message: 'Envie apenas os filtros data, status e search, sem corpo na consulta.' });
            }
            const filters = {
                data: req.query.data?.trim() || '', status: req.query.status?.trim() || '', search: req.query.search?.trim() || ''
            };
            if (filters.data && !isDate(filters.data)) {
                return res.status(400).json({ message: 'Informe uma data real em YYYY-MM-DD.' });
            }
            if (filters.status && !RESERVATION_STATUSES.includes(filters.status)) {
                return res.status(400).json({ message: 'Informe um status de reserva válido.' });
            }
            if (filters.search.length > 120) {
                return res.status(400).json({ message: 'A busca deve ter até 120 caracteres.' });
            }
            try {
                const reservations = await Reservation.findAll(filters);
                res.json(reservations.map(publicReservation));
            } catch (error) {
                next(error);
            }
        },
        async updateReservationStatus(req, res, next) {
            const id = req.params.id;
            if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 4294967295 || Object.keys(req.query).length) {
                return res.status(400).json({ message: 'Informe um ID de reserva válido, sem parâmetros de consulta.' });
            }
            const body = req.body;
            if (!body || typeof body !== 'object' || Array.isArray(body)
                || Object.keys(body).some((field) => !['status', 'reason'].includes(field))) {
                return res.status(400).json({ message: 'Envie apenas status e reason em um objeto JSON.' });
            }
            const status = typeof body.status === 'string' ? body.status.trim() : '';
            if (!RESERVATION_STATUSES.slice(1).includes(status)) {
                return res.status(400).json({ message: 'Escolha finalizada, cancelada ou nao_compareceu.' });
            }
            if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.trim().length > 160)) {
                return res.status(400).json({ message: 'O motivo deve ser um texto com até 160 caracteres.' });
            }
            const reason = body.reason?.trim() || '';
            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                await Reservation.lockSettings(connection);
                const current = await Reservation.findStatusForUpdate(id, connection);
                if (!current) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Reserva não encontrada.' });
                }
                if (current.status !== 'ativa') {
                    await connection.rollback();
                    return res.status(409).json({ message: 'Esta reserva já possui status definitivo e não pode ser alterada.' });
                }
                const affected = await Reservation.updateStatus(id, { status, reason, adminId: req.user.id }, connection);
                if (affected !== 1) {
                    await connection.rollback();
                    return res.status(409).json({ message: 'Esta reserva já foi encerrada. Atualize a listagem.' });
                }
                const reservation = await Reservation.findById(id, connection);
                await connection.commit();
                res.json(publicReservation(reservation));
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        },
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
