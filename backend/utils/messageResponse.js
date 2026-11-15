function publicMessage(message) {
    return {
        ...message,
        id: String(message.id), usuarioId: String(message.usuarioId), createdAt: Number(message.createdAt),
        respostaEm: message.respostaEm === null ? null : Number(message.respostaEm),
        respostaPor: message.respostaPor === null ? null : String(message.respostaPor)
    };
}

module.exports = { publicMessage };
