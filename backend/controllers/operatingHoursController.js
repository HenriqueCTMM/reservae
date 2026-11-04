const pool = require('../config/database');
const { getRestaurantDateTime } = require('../utils/dateTime');

const WEEK_DAYS = ['0', '1', '2', '3', '4', '5', '6'];

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isDate(value) {
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateSchedule(schedule) {
    if (!isObject(schedule) || Object.keys(schedule).some((field) => !['open', 'shifts'].includes(field))
        || typeof schedule.open !== 'boolean' || !Array.isArray(schedule.shifts)) {
        return 'Informe open booleano e shifts como lista, sem campos extras.';
    }
    if ((!schedule.open && schedule.shifts.length !== 0)
        || (schedule.open && (schedule.shifts.length < 1 || schedule.shifts.length > 2))) {
        return 'Fechado exige lista vazia; aberto exige um ou dois turnos.';
    }
    let previousEnd = '';
    for (const shift of schedule.shifts) {
        if (!isObject(shift) || Object.keys(shift).some((field) => !['start', 'end'].includes(field))
            || !isTime(shift.start) || !isTime(shift.end) || shift.start >= shift.end) {
            return 'Cada turno exige start e end em HH:mm, com início anterior ao fim e sem campos extras.';
        }
        if (shift.start < previousEnd) {
            return 'Os turnos devem estar ordenados e não podem se sobrepor.';
        }
        previousEnd = shift.end;
    }
    return '';
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
        const message = validateSchedule(data.weekly[day]);
        if (message) return `Dia ${day}: ${message}`;
    }
    return '';
}

function validateException(data) {
    if (!isObject(data) || Object.keys(data).some((field) => !['open', 'shifts', 'reason'].includes(field))) {
        return 'Envie a exceção como um objeto com open, shifts e reason opcional.';
    }
    if (Object.hasOwn(data, 'reason') && (typeof data.reason !== 'string' || [...data.reason].length > 120)) {
        return 'O motivo deve ser um texto de até 120 caracteres.';
    }
    return validateSchedule({ open: data.open, shifts: data.shifts });
}

function scheduleFitsReservation(schedule, reservation) {
    return schedule.open && schedule.shifts.some((shift) =>
        shift.start <= reservation.horario && shift.end >= reservation.fim_previsto);
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

function publicException(exception) {
    return {
        id: exception.data,
        date: exception.data,
        ...publicSchedule(exception),
        reason: exception.motivo,
        updatedAt: Number(exception.updated_at_ms)
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
                res.json(exceptions.map(publicException));
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
                    const fits = scheduleFitsReservation(schedule, reservation);
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
        },

        async putException(req, res, next) {
            const date = req.params.date;
            if (!isDate(date)) return res.status(400).json({ message: 'Informe uma data real em YYYY-MM-DD, entre os anos 1000 e 9999.' });
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A gravação de exceções não aceita parâmetros de query.' });
            }
            const validationMessage = validateException(req.body);
            if (validationMessage) return res.status(400).json({ message: validationMessage });
            const schedule = { open: req.body.open, shifts: req.body.shifts, reason: req.body.reason ?? '' };

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                await OperatingHours.lockSettings(connection);
                const reservations = await OperatingHours.findReservationsForDate(date, getRestaurantDateTime(), connection);
                const conflict = reservations.find((reservation) => !scheduleFitsReservation(schedule, reservation));
                if (conflict) {
                    await connection.rollback();
                    return res.status(409).json({ message: `Esta exceção inviabiliza a reserva ativa de ${date} na mesa ${conflict.numero}.` });
                }

                await OperatingHours.saveException(date, schedule, connection);
                const exception = await OperatingHours.findException(date, connection);
                await connection.commit();
                res.json(publicException(exception));
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        },

        async deleteException(req, res, next) {
            const date = req.params.date;
            if (!isDate(date)) return res.status(400).json({ message: 'Informe uma data real em YYYY-MM-DD, entre os anos 1000 e 9999.' });
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A exclusão de exceções não aceita parâmetros de query.' });
            }
            if (req.body && (Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
                return res.status(400).json({ message: 'A exclusão de exceções não aceita dados no corpo da requisição.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                await OperatingHours.lockSettings(connection);
                const exception = await OperatingHours.findException(date, connection);
                if (!exception) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Exceção não encontrada.' });
                }

                const days = await OperatingHours.findWeekly(connection);
                const day = new Date(`${date}T00:00:00Z`).getUTCDay();
                const schedule = publicOperatingHours(days).weekly[day];
                const reservations = await OperatingHours.findReservationsForDate(date, getRestaurantDateTime(), connection);
                const conflict = reservations.find((reservation) => !scheduleFitsReservation(schedule, reservation));
                if (conflict) {
                    await connection.rollback();
                    return res.status(409).json({ message: `Remover esta exceção inviabiliza a reserva ativa de ${date} na mesa ${conflict.numero}.` });
                }

                await OperatingHours.removeException(date, connection);
                await connection.commit();
                res.json({ message: 'Exceção removida com sucesso.' });
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        }
    };
};
