import { request } from './api-service.js';

const WEEK_DAYS = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' }
];

function isTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(time) {
    if (!isTime(time)) {
        return null;
    }

    const [hours, minutes] = time.split(':').map(Number);

    return (hours * 60) + minutes;
}

export function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!remainingMinutes) {
        return `${hours}h`;
    }

    return `${hours}h${String(remainingMinutes).padStart(2, '0')}`;
}

function normalizeShifts(shifts = []) {
    const shiftList = Array.isArray(shifts) ? shifts : Object.values(shifts || {});

    return shiftList
        .filter((shift) => shift?.start || shift?.end)
        .map((shift) => ({
            start: shift.start || '',
            end: shift.end || ''
        }));
}

export function validateSchedule(schedule) {
    const shifts = normalizeShifts(schedule.shifts);

    if (!schedule.open) {
        return { valid: true, message: '' };
    }

    if (!shifts.length) {
        return { valid: false, message: 'Informe pelo menos um turno para dias abertos.' };
    }

    if (shifts.length > 2) {
        return { valid: false, message: 'Informe no máximo dois turnos por dia.' };
    }

    const timedShifts = shifts.map((shift) => ({
        ...shift,
        startMinutes: timeToMinutes(shift.start),
        endMinutes: timeToMinutes(shift.end)
    }));

    for (const shift of timedShifts) {
        if (shift.startMinutes === null || shift.endMinutes === null) {
            return { valid: false, message: 'Preencha início e fim dos turnos.' };
        }

        if (shift.endMinutes <= shift.startMinutes) {
            return { valid: false, message: 'O fim do turno deve ser maior que o início no mesmo dia.' };
        }
    }

    for (let index = 1; index < timedShifts.length; index += 1) {
        if (timedShifts[index].startMinutes < timedShifts[index - 1].endMinutes) {
            return { valid: false, message: 'Os turnos devem estar ordenados e não podem se sobrepor.' };
        }
    }

    return { valid: true, message: '' };
}

export function normalizeSchedule(schedule) {
    const open = Boolean(schedule.open);
    const shifts = open ? normalizeShifts(schedule.shifts) : [];

    return { open, shifts };
}

export async function getOperatingHoursConfig() {
    return request('/operating-hours');
}

export async function saveOperatingHoursConfig(config) {
    const data = { weekly: config.weekly };
    for (const field of ['minAdvanceMinutes', 'slotIntervalMinutes']) {
        if (Object.hasOwn(config, field)) data[field] = config[field];
    }
    return request('/operating-hours', {
        method: 'PUT', body: JSON.stringify(data)
    });
}

export async function getOperatingHourExceptions() {
    return request('/operating-hours/exceptions');
}

export async function saveOperatingHourException(exception) {
    const data = { open: exception.open, shifts: exception.shifts };
    if (Object.hasOwn(exception, 'reason')) data.reason = exception.reason;
    return request(`/operating-hours/exceptions/${encodeURIComponent(exception.date)}`, {
        method: 'PUT', body: JSON.stringify(data)
    });
}

export async function removeOperatingHourException(date) {
    return request(`/operating-hours/exceptions/${encodeURIComponent(date)}`, { method: 'DELETE' });
}

export { WEEK_DAYS };
