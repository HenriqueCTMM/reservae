const pool = require('../config/database');

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

module.exports = { findByNumber, create };
