import { request } from './api-service.js';

export async function getReservations(filters = {}) {
    const query = new URLSearchParams();
    for (const field of ['data', 'status', 'search']) {
        if (filters[field]) query.set(field, filters[field]);
    }
    return request(`/reservations${query.size ? `?${query}` : ''}`);
}

export async function getMyReservations() {
    return request('/reservations/mine');
}

export async function createReservation(reservation) {
    return request('/reservations', {
        method: 'POST',
        body: JSON.stringify({
            mesaId: reservation.mesaId, data: reservation.data,
            horario: reservation.horario, pessoas: reservation.pessoas
        })
    });
}

export async function updateReservationStatus(reservationId, { status, reason }) {
    return request(`/reservations/${encodeURIComponent(reservationId)}/status`, {
        method: 'PATCH', body: JSON.stringify({ status, reason })
    });
}
