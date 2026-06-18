const pool = require('../config/database');

async function findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
}

async function findById(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}

async function create(nome, email, hashedPassword) {
    const [result] = await pool.execute(
        'INSERT INTO users (nome, email, password) VALUES (?, ?, ?)',
        [nome, email, hashedPassword]
    );
    return result.insertId;
}

module.exports = { findByEmail, findById, create };
