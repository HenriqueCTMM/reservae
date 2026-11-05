const pool = require('../config/database');

// A criação e o histórico retornam o mesmo objeto, com dados obtidos pelos relacionamentos.
const RESERVATION_SELECT = `
    SELECT reservation.id, reservation.usuario_id AS usuarioId,
        client.nome AS usuarioNome, client.email AS usuarioEmail,
        reservation.mesa_id AS mesaId, table_data.numero AS mesaNumero, table_data.capacidade AS mesaCapacidade,
        DATE_FORMAT(reservation.data, '%Y-%m-%d') AS data,
        TIME_FORMAT(reservation.horario, '%H:%i') AS horario, reservation.pessoas,
        reservation.duracao_minutos AS duracaoMinutos, TIME_FORMAT(reservation.fim_previsto, '%H:%i') AS fimPrevisto,
        reservation.status, UNIX_TIMESTAMP(reservation.created_at) * 1000 AS createdAt,
        UNIX_TIMESTAMP(reservation.status_updated_at) * 1000 AS statusUpdatedAt,
        reservation.status_updated_by AS statusUpdatedBy, admin.nome AS statusUpdatedByName,
        reservation.status_reason AS statusReason
    FROM reservations AS reservation
    JOIN users AS client ON client.id = reservation.usuario_id
    JOIN tables AS table_data ON table_data.id = reservation.mesa_id
    LEFT JOIN users AS admin ON admin.id = reservation.status_updated_by
`;

async function lockSettings(connection) {
    const [rows] = await connection.execute('SELECT id FROM operating_settings WHERE id = 1 FOR UPDATE');
    if (!rows.length) throw new Error('Execute npm run db:init antes de criar reservas.');
}

async function findTableForUpdate(id, connection) {
    const [rows] = await connection.execute('SELECT id, status, capacidade FROM tables WHERE id = ? FOR UPDATE', [id]);
    return rows[0];
}

async function hasConflict({ mesaId, data, horario, fimPrevisto }, connection) {
    const [rows] = await connection.execute(`
        SELECT id FROM reservations
        WHERE mesa_id = ? AND data = ? AND status = 'ativa'
            AND horario < ? AND fim_previsto > ?
        LIMIT 1
    `, [mesaId, data, fimPrevisto, horario]);
    return rows.length > 0;
}

async function create({ usuarioId, mesaId, data, horario, pessoas, duracaoMinutos, fimPrevisto }, connection) {
    const [result] = await connection.execute(`
        INSERT INTO reservations (usuario_id, mesa_id, data, horario, pessoas, duracao_minutos, fim_previsto, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ativa')
    `, [usuarioId, mesaId, data, horario, pessoas, duracaoMinutos, fimPrevisto]);
    return result.insertId;
}

async function findById(id, connection) {
    const [rows] = await connection.execute(`
        ${RESERVATION_SELECT}
        WHERE reservation.id = ?
    `, [id]);
    return rows[0];
}

async function findByUser(usuarioId) {
    const [rows] = await pool.execute(`
        ${RESERVATION_SELECT}
        WHERE reservation.usuario_id = ?
        ORDER BY reservation.data, reservation.horario, reservation.id
    `, [usuarioId]);
    return rows;
}

module.exports = { lockSettings, findTableForUpdate, hasConflict, create, findById, findByUser };
