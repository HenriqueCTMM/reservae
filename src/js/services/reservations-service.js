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

export async function removeReservation(reservationId) {
    return removeById(RESERVATIONS_PATH, reservationId);
}

export { BLOCKING_RESERVATION_STATUS, RESERVATIONS_PATH };
