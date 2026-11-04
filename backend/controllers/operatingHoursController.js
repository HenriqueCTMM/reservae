const pool = require('../config/database');
const { getRestaurantDateTime } = require('../utils/dateTime');

const WEEK_DAYS = ['0', '1', '2', '3', '4', '5', '6'];

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateOperatingHours(data) {
    if (!isObject(data)) return 'Informe a configuração em um objeto JSON.';
    const allowedFields = ['weekly', 'minAdvanceMinutes', 'slotIntervalMinutes'];
    if (Object.keys(data).some((field) => !allowedFields.includes(field))) {
        return 'Envie apenas weekly, minAdvanceMinutes e slotIntervalMinutes.';
    }
    if ((Object.hasOwn(data, 'minAdvanceMinutes') && data.minAdvanceMinutes !== 180)
        || (Object.hasOwn(data, 'slotIntervalMinutes') && data.slotIntervalMinutes !== 30)) {
        return 'A antecedência deve ser 180 minutos e o intervalo deve ser 30 minutos.';
    }
    if (!isObject(data.weekly) || Object.keys(data.weekly).length !== 7
        || WEEK_DAYS.some((day) => !Object.hasOwn(data.weekly, day))) {
        return 'Informe os sete dias da semana, com chaves de 0 a 6.';
    }
    for (const day of WEEK_DAYS) {
        const schedule = data.weekly[day];
        if (!isObject(schedule) || Object.keys(schedule).some((field) => !['open', 'shifts'].includes(field))
            || typeof schedule.open !== 'boolean' || !Array.isArray(schedule.shifts)) {
            return `Dia ${day}: informe open booleano e shifts como lista, sem campos extras.`;
        }
        if ((!schedule.open && schedule.shifts.length !== 0)
            || (schedule.open && (schedule.shifts.length < 1 || schedule.shifts.length > 2))) {
            return `Dia ${day}: fechado exige lista vazia; aberto exige um ou dois turnos.`;
        }
        let previousEnd = '';
        for (const shift of schedule.shifts) {
            if (!isObject(shift) || Object.keys(shift).some((field) => !['start', 'end'].includes(field))
                || !isTime(shift.start) || !isTime(shift.end) || shift.start >= shift.end) {
                return `Dia ${day}: cada turno exige start e end em HH:mm, com início anterior ao fim e sem campos extras.`;
            }
            if (shift.start < previousEnd) {
                return `Dia ${day}: os turnos devem estar ordenados e não podem se sobrepor.`;
            }
            previousEnd = shift.end;
        }
    }
    return '';
}

function publicSchedule(schedule) {
    const open = Boolean(schedule.aberto);
    const shifts = [];
    if (open) {
        shifts.push({ start: schedule.inicio_turno_1, end: schedule.fim_turno_1 });
        if (schedule.inicio_turno_2 !== null) {
            shifts.push({ start: schedule.inicio_turno_2, end: schedule.fim_turno_2 });
        }
    }
    return { open, shifts };
}

function publicOperatingHours(days) {
    const weekly = {};
    for (const day of days) {
        weekly[day.dia_semana] = publicSchedule(day);
    }
    return {
        minAdvanceMinutes: days[0].min_advance_minutes,
        slotIntervalMinutes: days[0].slot_interval_minutes,
        weekly,
        updatedAt: Math.max(...days.map((day) => Number(day.updated_at_ms)))
    };
}

module.exports = function createOperatingHoursController(OperatingHours) {
    return {
        async getOperatingHours(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A consulta de horários de funcionamento não aceita filtros.' });
            }

            try {
                const days = await OperatingHours.findWeekly();
                res.json(publicOperatingHours(days));
            } catch (error) {
                next(error);
            }
        },

        async getExceptions(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A consulta de exceções de funcionamento não aceita filtros.' });
            }

            try {
                const exceptions = await OperatingHours.findExceptions();
                res.json(exceptions.map((exception) => ({
                    id: exception.data,
                    date: exception.data,
                    ...publicSchedule(exception),
                    reason: exception.motivo,
                    updatedAt: Number(exception.updated_at_ms)
                })));
            } catch (error) {
                next(error);
            }
        },

        async putOperatingHours(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A gravação de horários de funcionamento não aceita parâmetros de query.' });
            }
            const validationMessage = validateOperatingHours(req.body);
            if (validationMessage) return res.status(400).json({ message: validationMessage });

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                await OperatingHours.lockSettings(connection);
                // Confirmar que os sete dias existem antes de tentar substituir a programação.
                await OperatingHours.findWeekly(connection);
                const reservations = await OperatingHours.findReservationsWithoutException(getRestaurantDateTime(), connection);
                for (const reservation of reservations) {
                    const schedule = req.body.weekly[reservation.dia_semana];
                    const fits = schedule.open && schedule.shifts.some((shift) =>
                        shift.start <= reservation.horario && shift.end >= reservation.fim_previsto);
                    if (!fits) {
                        await connection.rollback();
                        return res.status(409).json({
                            message: `Esta alteração inviabiliza a reserva ativa de ${reservation.data} na mesa ${reservation.numero}.`
                        });
                    }
                }

                await OperatingHours.updateWeekly(req.body.weekly, connection);
                const days = await OperatingHours.findWeekly(connection);
                await connection.commit();
                res.json(publicOperatingHours(days));
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        }
    };
};
