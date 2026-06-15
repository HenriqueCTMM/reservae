import {
    createTimestamp,
    createWithPush,
    getById,
    getCollection,
    queryByChild,
    removeById,
    updateById
} from './realtime-database-service.js';

const MESSAGES_PATH = 'messages';
const DEFAULT_MESSAGE_STATUS = 'aberta';

export async function getMessages() {
    const messages = await getCollection(MESSAGES_PATH);
    return messages.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMessagesByUser(usuarioId) {
    const messages = await queryByChild(MESSAGES_PATH, 'usuarioId', usuarioId);
    return messages.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createMessage(message) {
    return createWithPush(MESSAGES_PATH, {
        ...message,
        status: message.status || DEFAULT_MESSAGE_STATUS,
        createdAt: message.createdAt || createTimestamp()
    });
}

export async function updateMessageReply(messageId, { reply, admin }) {
    const message = await getById(MESSAGES_PATH, messageId);

    if (message?.resposta) {
        throw new Error('Esta mensagem já possui resposta e não pode ser editada.');
    }

    return updateById(MESSAGES_PATH, messageId, {
        resposta: reply,
        respostaEm: createTimestamp(),
        respostaPor: admin.id,
        respostaPorNome: admin.nome,
        status: 'respondida'
    });
}

export async function removeMessage(messageId) {
    return removeById(MESSAGES_PATH, messageId);
}

export { DEFAULT_MESSAGE_STATUS, MESSAGES_PATH };
