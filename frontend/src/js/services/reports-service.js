import { request } from './api-service.js';

export async function getReservationsReport(filters = {}) {
    const query = new URLSearchParams();
    for (const field of ['startDate', 'endDate', 'status', 'search']) {
        if (filters[field]) query.set(field, filters[field]);
    }
    return request(`/reports/reservations${query.size ? `?${query}` : ''}`);
}
