const pool = require('../config/database');

function publicMessage(message) {
    return {
        ...message,
        id: String(message.id), usuarioId: String(message.usuarioId), createdAt: Number(message.createdAt),
        respostaEm: message.respostaEm === null ? null : Number(message.respostaEm),
        respostaPor: message.respostaPor === null ? null : String(message.respostaPor)
    };
}

module.exports = function createMessageController(Message) {
    return {
        async getMyMessages(req, res, next) {
            if (Object.keys(req.query).length
                || req.get('Transfer-Encoding') !== undefined || Number(req.get('Content-Length') || 0) > 0) {
                return res.status(400).json({ message: 'A consulta de suas mensagens não aceita filtros ou corpo.' });
            }
            try {
                const messages = await Message.findByUser(req.user.id);
                res.json(messages.map(publicMessage));
            } catch (error) {
                next(error);
            }
        },
        async createMessage(req, res, next) {
            if (Object.keys(req.query).length) {
                return res.status(400).json({ message: 'O envio de mensagens não aceita parâmetros de consulta.' });
            }
            const body = req.body;
            if (!body || typeof body !== 'object' || Array.isArray(body)
                || Object.keys(body).some((field) => !['assunto', 'mensagem'].includes(field))) {
                return res.status(400).json({ message: 'Envie apenas assunto e mensagem em um objeto JSON.' });
            }
            const assunto = typeof body.assunto === 'string' ? body.assunto.trim() : '';
            const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim() : '';
            if (!assunto || [...assunto].length > 80 || !mensagem || [...mensagem].length > 500) {
                return res.status(400).json({ message: 'Preencha assunto com até 80 caracteres e mensagem com até 500 caracteres.' });
            }
            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                const id = await Message.create({ usuarioId: req.user.id, assunto, mensagem }, connection);
                const message = await Message.findById(id, connection);
                await connection.commit();
                res.status(201).json(publicMessage(message));
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        }
    };
};
