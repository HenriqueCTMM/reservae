const pool = require('../config/database');

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

module.exports = { seedWeeklyDefaults };
