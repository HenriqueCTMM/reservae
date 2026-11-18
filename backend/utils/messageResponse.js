function publicMessage(message) {
    const { reservaId, reservaMesaNumero, reservaData, reservaHorario, ...fields } = message;
    return {
        ...fields,
        id: String(message.id), usuarioId: String(message.usuarioId), createdAt: Number(message.createdAt),
        respostaEm: message.respostaEm === null ? null : Number(message.respostaEm),
        respostaPor: message.respostaPor === null ? null : String(message.respostaPor),
        reserva: reservaId == null ? null : {
            id: String(reservaId), mesaNumero: reservaMesaNumero, data: reservaData, horario: reservaHorario
        }
    };
}

module.exports = { publicMessage };
