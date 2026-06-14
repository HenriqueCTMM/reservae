import {
    createTimestamp,
    createWithPush,
    getById,
    getCollection,
    queryByChild,
    removeById,
    updateById
} from './realtime-database-service.js';

const RESERVATIONS_PATH = 'reservations';
const BLOCKING_RESERVATION_STATUS = 'ativa';
const FINAL_RESERVATION_STATUSES = ['finalizada', 'cancelada', 'nao_compareceu'];

export async function getReservations() {
    const reservations = await getCollection(RESERVATIONS_PATH);
    return reservations.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));
}

export async function getReservationById(reservationId) {
    return getById(RESERVATIONS_PATH, reservationId);
}

export async function getReservationsByUser(usuarioId) {
    const reservations = await queryByChild(RESERVATIONS_PATH, 'usuarioId', usuarioId);
    return reservations.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));
}

export async function getReservationsByTable(mesaId) {
    return queryByChild(RESERVATIONS_PATH, 'mesaId', mesaId);
}

export async function getActiveReservationConflict({ mesaId, data, horario }) {
    const tableReservations = await getReservationsByTable(mesaId);

    return tableReservations.find((reservation) => (
        reservation.data === data
        && reservation.horario === horario
        && reservation.status === BLOCKING_RESERVATION_STATUS
    )) || null;
}

export async function createReservation(reservation) {
    return createWithPush(RESERVATIONS_PATH, {
        ...reservation,
        pessoas: Number(reservation.pessoas),
        status: reservation.status || BLOCKING_RESERVATION_STATUS,
        createdAt: reservation.createdAt || createTimestamp()
    });
}

export async function updateReservation(reservationId, data) {
    return updateById(RESERVATIONS_PATH, reservationId, data);
}

export async function updateReservationStatus(reservationId, { status, admin, reason }) {
    if (!FINAL_RESERVATION_STATUSES.includes(status)) {
        throw new Error('Status de finalização inválido.');
    }

    const reservation = await getReservationById(reservationId);

    if (!reservation) {
        throw new Error('Reserva não encontrada.');
    }

    if (reservation.status !== BLOCKING_RESERVATION_STATUS) {
        throw new Error('Esta reserva já possui status definitivo.');
    }

    return updateById(RESERVATIONS_PATH, reservationId, {
        status,
        statusUpdatedAt: createTimestamp(),
        statusUpdatedBy: admin.id,
        statusUpdatedByName: admin.nome,
        statusReason: reason || ''
    });
}

export async function removeReservation(reservationId) {
    return removeById(RESERVATIONS_PATH, reservationId);
}

export { BLOCKING_RESERVATION_STATUS, FINAL_RESERVATION_STATUSES, RESERVATIONS_PATH };
