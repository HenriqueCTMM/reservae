async function findSchedule(date, connection) {
    const [rows] = await connection.execute(`
        SELECT settings.min_advance_minutes, settings.slot_interval_minutes,
            CASE WHEN exception_data.data IS NOT NULL THEN exception_data.aberto ELSE weekly.aberto END AS aberto,
            TIME_FORMAT(CASE WHEN exception_data.data IS NOT NULL THEN exception_data.inicio_turno_1 ELSE weekly.inicio_turno_1 END, '%H:%i') AS inicio_turno_1,
            TIME_FORMAT(CASE WHEN exception_data.data IS NOT NULL THEN exception_data.fim_turno_1 ELSE weekly.fim_turno_1 END, '%H:%i') AS fim_turno_1,
            TIME_FORMAT(CASE WHEN exception_data.data IS NOT NULL THEN exception_data.inicio_turno_2 ELSE weekly.inicio_turno_2 END, '%H:%i') AS inicio_turno_2,
            TIME_FORMAT(CASE WHEN exception_data.data IS NOT NULL THEN exception_data.fim_turno_2 ELSE weekly.fim_turno_2 END, '%H:%i') AS fim_turno_2
        FROM operating_settings AS settings
        JOIN weekly_operating_hours AS weekly ON weekly.dia_semana = DAYOFWEEK(?) - 1
        LEFT JOIN operating_exceptions AS exception_data ON exception_data.data = ?
        WHERE settings.id = 1
    `, [date, date]);
    if (!rows.length) throw new Error('Execute npm run db:init para preparar a configuração e os dias da semana.');
    return rows[0];
}

async function findTables(date, start, end, connection) {
    const [rows] = await connection.execute(`
        SELECT table_data.id, table_data.numero, table_data.capacidade, table_data.status,
            table_data.posicao_x, table_data.posicao_y, table_data.rotacao,
            UNIX_TIMESTAMP(table_data.created_at) * 1000 AS created_at_ms,
            UNIX_TIMESTAMP(table_data.updated_at) * 1000 AS updated_at_ms,
            EXISTS (
                SELECT 1 FROM reservations AS reservation
                WHERE reservation.mesa_id = table_data.id AND reservation.data = ?
                    AND reservation.status = 'ativa'
                    AND reservation.horario < ? AND reservation.fim_previsto > ?
            ) AS has_conflict
        FROM tables AS table_data
        ORDER BY table_data.numero, table_data.id
    `, [date, end, start]);
    return rows;
}

module.exports = { findSchedule, findTables };
