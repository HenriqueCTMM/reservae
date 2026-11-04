const pool = require('../config/database');

const EXCEPTION_FIELDS = `DATE_FORMAT(data, '%Y-%m-%d') AS data, aberto, motivo,
    TIME_FORMAT(inicio_turno_1, '%H:%i') AS inicio_turno_1,
    TIME_FORMAT(fim_turno_1, '%H:%i') AS fim_turno_1,
    TIME_FORMAT(inicio_turno_2, '%H:%i') AS inicio_turno_2,
    TIME_FORMAT(fim_turno_2, '%H:%i') AS fim_turno_2,
    UNIX_TIMESTAMP(updated_at) * 1000 AS updated_at_ms`;

async function findWeekly(connection = pool) {
    const [rows] = await connection.execute(`
        SELECT settings.min_advance_minutes, settings.slot_interval_minutes,
            weekly.dia_semana, weekly.aberto,
            TIME_FORMAT(weekly.inicio_turno_1, '%H:%i') AS inicio_turno_1,
            TIME_FORMAT(weekly.fim_turno_1, '%H:%i') AS fim_turno_1,
            TIME_FORMAT(weekly.inicio_turno_2, '%H:%i') AS inicio_turno_2,
            TIME_FORMAT(weekly.fim_turno_2, '%H:%i') AS fim_turno_2,
            UNIX_TIMESTAMP(GREATEST(settings.updated_at, weekly.updated_at)) * 1000 AS updated_at_ms
        FROM operating_settings AS settings
        CROSS JOIN weekly_operating_hours AS weekly
        WHERE settings.id = 1
        ORDER BY weekly.dia_semana
    `);
    if (rows.length !== 7) {
        throw new Error('Execute npm run db:init para preparar a configuração e os sete dias da semana.');
    }
    return rows;
}

async function findExceptions() {
    const [rows] = await pool.execute(`
        SELECT ${EXCEPTION_FIELDS}
        FROM operating_exceptions
        ORDER BY data
    `);
    return rows;
}

async function findException(date, connection) {
    const [rows] = await connection.execute(`SELECT ${EXCEPTION_FIELDS} FROM operating_exceptions WHERE data = ?`, [date]);
    return rows[0];
}

async function findReservationsForDate(date, now, connection) {
    const [rows] = await connection.execute(`
        SELECT table_data.numero,
            TIME_FORMAT(reservation.horario, '%H:%i') AS horario,
            TIME_FORMAT(reservation.fim_previsto, '%H:%i') AS fim_previsto
        FROM reservations AS reservation
        JOIN tables AS table_data ON table_data.id = reservation.mesa_id
        WHERE reservation.data = ? AND reservation.status = 'ativa'
            AND TIMESTAMP(reservation.data, reservation.fim_previsto) > ?
        ORDER BY reservation.horario, reservation.id
    `, [date, now]);
    return rows;
}

async function saveException(date, schedule, connection) {
    const [first, second] = schedule.shifts;
    const values = [schedule.open, schedule.reason,
        first ? first.start : null, first ? first.end : null,
        second ? second.start : null, second ? second.end : null];
    await connection.execute(`
        INSERT INTO operating_exceptions
            (data, aberto, motivo, inicio_turno_1, fim_turno_1, inicio_turno_2, fim_turno_2)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE aberto = ?, motivo = ?, inicio_turno_1 = ?, fim_turno_1 = ?,
            inicio_turno_2 = ?, fim_turno_2 = ?, updated_at = CURRENT_TIMESTAMP
    `, [date, ...values, ...values]);
}

async function removeException(date, connection) {
    await connection.execute('DELETE FROM operating_exceptions WHERE data = ?', [date]);
}

async function lockSettings(connection) {
    const [rows] = await connection.execute('SELECT id FROM operating_settings WHERE id = 1 FOR UPDATE');
    if (!rows.length) throw new Error('Execute npm run db:init antes de alterar os horários.');
}

async function findReservationsWithoutException(now, connection) {
    const [rows] = await connection.execute(`
        SELECT DATE_FORMAT(reservation.data, '%Y-%m-%d') AS data,
            DAYOFWEEK(reservation.data) - 1 AS dia_semana, table_data.numero,
            TIME_FORMAT(reservation.horario, '%H:%i') AS horario,
            TIME_FORMAT(reservation.fim_previsto, '%H:%i') AS fim_previsto
        FROM reservations AS reservation
        JOIN tables AS table_data ON table_data.id = reservation.mesa_id
        LEFT JOIN operating_exceptions AS exception_data ON exception_data.data = reservation.data
        WHERE reservation.status = 'ativa'
            AND TIMESTAMP(reservation.data, reservation.fim_previsto) > ?
            AND exception_data.data IS NULL
        ORDER BY reservation.data, reservation.horario, reservation.id
    `, [now]);
    return rows;
}

async function updateWeekly(weekly, connection) {
    for (const [day, schedule] of Object.entries(weekly)) {
        const [first, second] = schedule.shifts;
        await connection.execute(
            'UPDATE weekly_operating_hours SET aberto = ?, inicio_turno_1 = ?, fim_turno_1 = ?, inicio_turno_2 = ?, fim_turno_2 = ? WHERE dia_semana = ?',
            [schedule.open, first ? first.start : null, first ? first.end : null,
                second ? second.start : null, second ? second.end : null, day]
        );
    }
    // Uma semana salva explicitamente, mesmo toda fechada, não deve ser preenchida pelo seed.
    await connection.execute('UPDATE operating_settings SET demo_hours_seeded = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = 1');
}

async function seedWeeklyDefaults(defaultDays) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [settings] = await connection.query(
            'SELECT demo_hours_seeded FROM operating_settings WHERE id = 1 FOR UPDATE'
        );
        if (!settings.length) {
            throw new Error('Execute npm run db:init antes de preparar os horários.');
        }

        let created = false;
        if (!settings[0].demo_hours_seeded) {
            const [days] = await connection.query('SELECT * FROM weekly_operating_hours');
            if (days.length !== 7) {
                throw new Error('Execute npm run db:init para preparar os sete dias da semana.');
            }

            const hasSchedule = days.some((day) => day.aberto
                || day.inicio_turno_1 !== null || day.fim_turno_1 !== null
                || day.inicio_turno_2 !== null || day.fim_turno_2 !== null);

            // Só preencher a programação inicial: sete dias fechados e sem turnos.
            if (!hasSchedule) {
                for (const day of defaultDays) {
                    const [first = [null, null], second = [null, null]] = day.turnos;
                    await connection.execute(
                        'UPDATE weekly_operating_hours SET aberto = ?, inicio_turno_1 = ?, fim_turno_1 = ?, inicio_turno_2 = ?, fim_turno_2 = ? WHERE dia_semana = ?',
                        [day.turnos.length > 0, first[0], first[1], second[0], second[1], day.diaSemana]
                    );
                }
                created = true;
            }

            // O marcador impede que um fechamento posterior seja revertido pelo seed.
            await connection.query('UPDATE operating_settings SET demo_hours_seeded = TRUE WHERE id = 1');
        }
        await connection.commit();
        return created;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    findWeekly, findExceptions, findException, findReservationsForDate, saveException, removeException,
    lockSettings, findReservationsWithoutException, updateWeekly, seedWeeklyDefaults
};
