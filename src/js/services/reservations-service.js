import {
    createTimestamp,
    createWithPush,
    getById,
    getCollection,
    queryByChild,
    removeById,
    updateById,
    watchByChild
} from './realtime-database-service.js';
import {
    getReservationDurationMinutes,
    getReservationEndTime,
    getReservationPeriod,
    hasTimeOverlap,
    timeToMinutes
} from './operating-hours-service.js';

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

export async function getReservationsByDate(data) {
    const reservations = await queryByChild(RESERVATIONS_PATH, 'data', data);
    return reservations.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));
}

export function watchReservationsByDate(data, onChange, onError) {
    return watchByChild(RESERVATIONS_PATH, 'data', data, (reservations) => {
        onChange(reservations.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`)));
    }, onError);
}

export async function getReservationsByTable(mesaId) {
    return queryByChild(RESERVATIONS_PATH, 'mesaId', mesaId);
}

export async function getActiveReservationConflict({ mesaId, data, horario, pessoas }) {
    const tableReservations = await getReservationsByTable(mesaId);
    const startMinutes = timeToMinutes(horario);

    if (startMinutes === null) {
        return null;
    }

    const endMinutes = startMinutes + getReservationDurationMinutes(pessoas);

    return tableReservations.find((reservation) => {
        if (reservation.data !== data || reservation.status !== BLOCKING_RESERVATION_STATUS) {
            return false;
        }

        const period = getReservationPeriod(reservation);

        return period.startMinutes !== null
            && period.endMinutes !== null
            && hasTimeOverlap(startMinutes, endMinutes, period.startMinutes, period.endMinutes);
    }) || null;
}

export async function createReservation(reservation) {
    const pessoas = Number(reservation.pessoas);
    const duracaoMinutos = Number(reservation.duracaoMinutos || getReservationDurationMinutes(pessoas));

    return createWithPush(RESERVATIONS_PATH, {
        ...reservation,
        pessoas,
        duracaoMinutos,
        fimPrevisto: reservation.fimPrevisto || getReservationEndTime(reservation.horario, duracaoMinutos),
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
