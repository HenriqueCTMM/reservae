import { request } from './api-service.js';

export async function getMessages() {
    return request('/messages');
}

export async function getMyMessages() {
    return request('/messages/mine');
}

export async function createMessage(message) {
    return request('/messages', {
        method: 'POST', body: JSON.stringify({ assunto: message.assunto, mensagem: message.mensagem, reservaId: message.reservaId })
    });
}

export async function updateMessageReply(messageId, { reply }) {
    return request(`/messages/${encodeURIComponent(messageId)}/reply`, {
        method: 'PATCH', body: JSON.stringify({ reply })
    });
}
