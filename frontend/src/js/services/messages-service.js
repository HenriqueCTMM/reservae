import {
    request,
    removeById
} from './api-service.js';

const MESSAGES_PATH = 'messages';
const DEFAULT_MESSAGE_STATUS = 'aberta';

export async function getMessages() {
    return request('/messages');
}

export async function getMyMessages() {
    return request('/messages/mine');
}

export async function createMessage(message) {
    return request('/messages', {
        method: 'POST', body: JSON.stringify({ assunto: message.assunto, mensagem: message.mensagem })
    });
}

export async function updateMessageReply(messageId, { reply }) {
    return request(`/messages/${encodeURIComponent(messageId)}/reply`, {
        method: 'PATCH', body: JSON.stringify({ reply })
    });
}

export async function removeMessage(messageId) {
    return removeById(MESSAGES_PATH, messageId);
}

export { DEFAULT_MESSAGE_STATUS, MESSAGES_PATH };
