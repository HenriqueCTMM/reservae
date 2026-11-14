const pool = require('../config/database');

const MESSAGE_SELECT = `
    SELECT message.id, message.usuario_id AS usuarioId,
        client.nome AS usuarioNome, client.email AS usuarioEmail,
        message.assunto, message.mensagem, message.status,
        UNIX_TIMESTAMP(message.created_at) * 1000 AS createdAt,
        message.resposta, UNIX_TIMESTAMP(message.resposta_em) * 1000 AS respostaEm,
        message.resposta_por AS respostaPor, admin.nome AS respostaPorNome
    FROM messages AS message
    JOIN users AS client ON client.id = message.usuario_id
    LEFT JOIN users AS admin ON admin.id = message.resposta_por
`;

async function create({ usuarioId, assunto, mensagem }, connection) {
    const [result] = await connection.execute(`
        INSERT INTO messages (usuario_id, assunto, mensagem, status)
        VALUES (?, ?, ?, 'aberta')
    `, [usuarioId, assunto, mensagem]);
    return result.insertId;
}

async function findById(id, connection) {
    const [rows] = await connection.execute(`${MESSAGE_SELECT} WHERE message.id = ?`, [id]);
    return rows[0];
}

async function findByUser(usuarioId) {
    const [rows] = await pool.execute(`
        ${MESSAGE_SELECT}
        WHERE message.usuario_id = ?
        ORDER BY message.created_at DESC, message.id DESC
    `, [usuarioId]);
    return rows;
}

module.exports = { create, findById, findByUser };
