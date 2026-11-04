const pool = require('../config/database');

async function findAll() {
    const [rows] = await pool.execute(`
        SELECT id, numero, capacidade, status, posicao_x, posicao_y, rotacao,
            UNIX_TIMESTAMP(created_at) * 1000 AS created_at_ms,
            UNIX_TIMESTAMP(updated_at) * 1000 AS updated_at_ms
        FROM tables
        ORDER BY numero, id
    `);
    return rows;
}

async function findByNumber(numero) {
    const [rows] = await pool.execute('SELECT * FROM tables WHERE numero = ?', [numero]);
    return rows[0];
}

async function findById(id, connection = pool) {
    const [rows] = await connection.execute(`
        SELECT id, numero, capacidade, status, posicao_x, posicao_y, rotacao,
            UNIX_TIMESTAMP(created_at) * 1000 AS created_at_ms,
            UNIX_TIMESTAMP(updated_at) * 1000 AS updated_at_ms
        FROM tables
        WHERE id = ?
    `, [id]);
    return rows[0];
}

async function create({ numero, capacidade, status, posicaoX, posicaoY, rotacao = 0 }) {
    const [result] = await pool.execute(
        'INSERT INTO tables (numero, capacidade, status, posicao_x, posicao_y, rotacao) VALUES (?, ?, ?, ?, ?, ?)',
        [numero, capacidade, status, posicaoX, posicaoY, rotacao]
    );
    return result.insertId;
}

async function lockSettings(connection) {
    const [rows] = await connection.execute('SELECT id FROM operating_settings WHERE id = 1 FOR UPDATE');
    if (!rows.length) throw new Error('Execute npm run db:init antes de editar mesas.');
}

async function hasReservationConflict(id, { capacidade, indisponivel, now }, connection) {
    const [rows] = await connection.execute(`
        SELECT id FROM reservations
        WHERE mesa_id = ? AND status = 'ativa'
            AND TIMESTAMP(data, fim_previsto) > ?
            AND (? = TRUE OR pessoas > ?)
        LIMIT 1
    `, [id, now, indisponivel, capacidade]);
    return rows.length > 0;
}

async function update(id, { numero, capacidade, status, posicaoX, posicaoY, rotacao }, connection) {
    await connection.execute(
        'UPDATE tables SET numero = ?, capacidade = ?, status = ?, posicao_x = ?, posicao_y = ?, rotacao = ? WHERE id = ?',
        [numero, capacidade, status, posicaoX, posicaoY, rotacao, id]
    );
}

module.exports = { findAll, findByNumber, findById, create, lockSettings, hasReservationConflict, update };
