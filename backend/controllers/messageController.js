const pool = require('../config/database');

const { publicMessage } = require('../utils/messageResponse');

module.exports = function createMessageController(Message) {
    return {
        async getMessages(req, res, next) {
            if (Object.keys(req.query).length
                || req.get('Transfer-Encoding') !== undefined || Number(req.get('Content-Length') || 0) > 0) {
                return res.status(400).json({ message: 'A consulta de mensagens não aceita filtros ou corpo.' });
            }
            try {
                const messages = await Message.findAll();
                res.json(messages.map(publicMessage));
            } catch (error) {
                next(error);
            }
        },
        async updateMessageReply(req, res, next) {
            const id = req.params.id;
            if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 4294967295 || Object.keys(req.query).length) {
                return res.status(400).json({ message: 'Informe um ID de mensagem válido, sem parâmetros de consulta.' });
            }
            const body = req.body;
            if (!body || typeof body !== 'object' || Array.isArray(body)
                || Object.keys(body).some((field) => field !== 'reply')) {
                return res.status(400).json({ message: 'Envie apenas reply em um objeto JSON.' });
            }
            const reply = typeof body.reply === 'string' ? body.reply.trim() : '';
            if (!reply || [...reply].length > 500) {
                return res.status(400).json({ message: 'Preencha uma resposta com até 500 caracteres.' });
            }
            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();
                // Mensagens não alteram disponibilidade: travar somente a mensagem respondida.
                const current = await Message.findReplyForUpdate(id, connection);
                if (!current) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Mensagem não encontrada.' });
                }
                if (current.status !== 'aberta' || current.resposta !== null) {
                    await connection.rollback();
                    return res.status(409).json({ message: 'Esta mensagem já possui resposta e não pode ser editada.' });
                }
                const affected = await Message.updateReply(id, { reply, adminId: req.user.id }, connection);
                if (affected !== 1) {
                    await connection.rollback();
                    return res.status(409).json({ message: 'Esta mensagem já foi respondida. Atualize a listagem.' });
                }
                const message = await Message.findById(id, connection);
                await connection.commit();
                res.json(publicMessage(message));
            } catch (error) {
                if (connection) await connection.rollback();
                next(error);
            } finally {
                if (connection) connection.release();
            }
        },
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
                || Object.keys(body).some((field) => !['assunto', 'mensagem', 'reservaId'].includes(field))) {
                return res.status(400).json({ message: 'Envie apenas assunto, mensagem e, opcionalmente, reservaId em um objeto JSON.' });
            }
            const reservaId = body.reservaId ?? null;
            if (reservaId !== null && (typeof reservaId !== 'string' || !/^[1-9]\d{0,9}$/.test(reservaId) || Number(reservaId) > 4294967295)) {
                return res.status(400).json({ message: 'Informe um ID de reserva válido.' });
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
                const id = await Message.create({ usuarioId: req.user.id, assunto, mensagem, reservaId }, connection);
                if (id === null) {
                    await connection.rollback();
                    return res.status(404).json({ message: 'Reserva não encontrada entre as suas reservas.' });
                }
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
