const pool = require('../config/database');
const { getRestaurantDateTime, isDate, isTime, timeToMinutes, minutesToTime } = require('../utils/dateTime');
const { getReservationDurationMinutes, getAllowedSlots } = require('../utils/reservationRules');

function publicTable(table, people) {
    let visualStatus = 'disponivel';
    let motivo = 'Pode ser selecionada para esta reserva.';
    if (table.status === 'indisponivel') {
        visualStatus = 'indisponivel';
        motivo = 'Mesa marcada como indisponível pelo restaurante.';
    } else if (table.capacidade < people) {
        visualStatus = 'indisponivel';
        motivo = `Capacidade menor que ${people} pessoas.`;
    } else if (Number(table.has_conflict) === 1) {
        visualStatus = 'reservada';
        motivo = 'Mesa já reservada neste período.';
    }
    return {
        id: String(table.id), numero: table.numero, capacidade: table.capacidade, status: table.status,
        posicaoX: table.posicao_x, posicaoY: table.posicao_y, rotacao: table.rotacao,
        createdAt: Number(table.created_at_ms), updatedAt: Number(table.updated_at_ms), visualStatus, motivo
    };
}

module.exports = function createAvailabilityController(Availability) {
    return {
        async getAvailability(req, res, next) {
            if (Object.keys(req.query).some((field) => !['data', 'pessoas', 'horario'].includes(field))) {
                return res.status(400).json({ message: 'Envie apenas data, pessoas e horario na consulta de disponibilidade.' });
            }
            const date = typeof req.query.data === 'string' ? req.query.data.trim() : '';
            const people = typeof req.query.pessoas === 'string' ? req.query.pessoas.trim() : '';
            const now = getRestaurantDateTime();
            if (!isDate(date) || date < now.slice(0, 10)) {
                return res.status(400).json({ message: 'Informe uma data real, não passada, em YYYY-MM-DD.' });
            }
            if (!/^[1-8]$/.test(people)) {
                return res.status(400).json({ message: 'Informe uma quantidade inteira de 1 a 8 pessoas.' });
            }
            if (req.query.horario !== undefined && typeof req.query.horario !== 'string') {
                return res.status(400).json({ message: 'Informe um único horário em HH:mm.' });
            }
            const time = req.query.horario?.trim() || null;
            if (time !== null && !isTime(time)) {
                return res.status(400).json({ message: 'Informe um horário real em HH:mm.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                // Snapshot de leitura: funcionamento e conflitos pertencem à mesma consulta lógica.
                await connection.beginTransaction();
                const schedule = await Availability.findSchedule(date, connection);
                const durationMinutes = getReservationDurationMinutes(Number(people));
                const slots = getAllowedSlots(date, schedule, durationMinutes, now);
                const closed = !Boolean(schedule.aberto);
                const allowed = time !== null && slots.includes(time);
                const end = allowed ? minutesToTime(timeToMinutes(time) + durationMinutes) : null;
                let reason = '';
                if (closed) reason = 'O restaurante não estará em funcionamento nesta data. Escolha outra data.';
                else if (!slots.length) reason = 'Não há horários disponíveis para esta data e quantidade de pessoas. Escolha outro dia.';
                else if (time !== null && !allowed) reason = 'O horário selecionado não está disponível. Escolha outro horário.';
                const tables = allowed ? await Availability.findTables(date, time, end, connection) : [];
                await connection.commit();
                res.json({
                    data: date, pessoas: Number(people), horario: time, duracaoMinutos: durationMinutes,
                    fimPrevisto: end, closed, horarioPermitido: allowed, slots, reason,
                    mesas: tables.map((table) => publicTable(table, Number(people)))
                });
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        }
    };
};
