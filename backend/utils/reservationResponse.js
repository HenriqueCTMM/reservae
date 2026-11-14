function publicReservation(reservation) {
    return {
        ...reservation,
        id: String(reservation.id), usuarioId: String(reservation.usuarioId), mesaId: String(reservation.mesaId),
        createdAt: Number(reservation.createdAt),
        statusUpdatedAt: reservation.statusUpdatedAt === null ? null : Number(reservation.statusUpdatedAt),
        statusUpdatedBy: reservation.statusUpdatedBy === null ? null : String(reservation.statusUpdatedBy)
    };
}

module.exports = { publicReservation };
