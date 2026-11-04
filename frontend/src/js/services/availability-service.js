import { request, watch } from './api-service.js';

export function getAvailability({ data, pessoas, horario }, options = {}) {
    const query = new URLSearchParams({ data, pessoas });
    if (horario) query.set('horario', horario);
    return request(`/availability?${query}`, options);
}

export function watchAvailability(filters, onChange, onError) {
    return watch((signal) => getAvailability(filters, { signal }), onChange, onError);
}
