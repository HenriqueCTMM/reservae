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

async function create({ numero, capacidade, status, posicaoX, posicaoY, rotacao = 0 }) {
    const [result] = await pool.execute(
        'INSERT INTO tables (numero, capacidade, status, posicao_x, posicao_y, rotacao) VALUES (?, ?, ?, ?, ?, ?)',
        [numero, capacidade, status, posicaoX, posicaoY, rotacao]
    );
    return result.insertId;
}

module.exports = { findAll, findByNumber, create };
