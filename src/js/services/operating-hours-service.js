import {
    createTimestamp,
    getCollection,
    getValue,
    removeById,
    setById,
    setValue
} from './realtime-database-service.js';

const OPERATING_HOURS_PATH = 'operatingHours';
const OPERATING_CONFIG_PATH = `${OPERATING_HOURS_PATH}/config`;
const OPERATING_EXCEPTIONS_PATH = `${OPERATING_HOURS_PATH}/exceptions`;
const MIN_ADVANCE_MINUTES = 180;
const SLOT_INTERVAL_MINUTES = 30;

const DEFAULT_WEEKLY = {
    0: { open: false, shifts: [] },
    1: { open: true, shifts: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
    2: { open: true, shifts: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
    3: { open: true, shifts: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
    4: { open: true, shifts: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
    5: { open: true, shifts: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:30' }] },
    6: { open: true, shifts: [{ start: '11:00', end: '15:00' }, { start: '18:00', end: '23:30' }] }
};

const WEEK_DAYS = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' }
];

export function getDefaultOperatingHoursConfig() {
    return {
        minAdvanceMinutes: MIN_ADVANCE_MINUTES,
        slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
        weekly: JSON.parse(JSON.stringify(DEFAULT_WEEKLY))
    };
}

function isTime(value) {
    return /^\d{2}:\d{2}$/.test(value || '');
}

export function timeToMinutes(time) {
    if (!isTime(time)) {
        return null;
    }

    const [hours, minutes] = time.split(':').map(Number);

    return (hours * 60) + minutes;
}

export function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getReservationDurationMinutes(people) {
    const totalPeople = Number(people);

    if (totalPeople >= 5) {
        return 150;
    }

    if (totalPeople >= 3) {
        return 120;
    }

    return 90;
}

export function getReservationEndTime(startTime, durationMinutes) {
    const startMinutes = timeToMinutes(startTime);

    if (startMinutes === null) {
        return null;
    }

    return minutesToTime(startMinutes + Number(durationMinutes));
}

export function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!remainingMinutes) {
        return `${hours}h`;
    }

    return `${hours}h${String(remainingMinutes).padStart(2, '0')}`;
}

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getWeekDay(date) {
    return new Date(`${date}T00:00:00`).getDay();
}

function roundUpToInterval(minutes, interval) {
    return Math.ceil(minutes / interval) * interval;
}

export function normalizeShifts(shifts = []) {
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

    const sortedShifts = shifts
        .map((shift) => ({
            ...shift,
            startMinutes: timeToMinutes(shift.start),
            endMinutes: timeToMinutes(shift.end)
        }))
        .sort((a, b) => a.startMinutes - b.startMinutes);

    for (const shift of sortedShifts) {
        if (shift.startMinutes === null || shift.endMinutes === null) {
            return { valid: false, message: 'Preencha início e fim dos turnos.' };
        }

        if (shift.endMinutes <= shift.startMinutes) {
            return { valid: false, message: 'O fim do turno deve ser maior que o início no mesmo dia.' };
        }
    }

    for (let index = 1; index < sortedShifts.length; index += 1) {
        if (sortedShifts[index].startMinutes < sortedShifts[index - 1].endMinutes) {
            return { valid: false, message: 'Os turnos não podem se sobrepor.' };
        }
    }

    return { valid: true, message: '' };
}

export function normalizeSchedule(schedule) {
    const open = Boolean(schedule.open);
    const shifts = open ? normalizeShifts(schedule.shifts) : [];

    return { open, shifts };
}

export function normalizeOperatingHoursConfig(config) {
    const fallback = getDefaultOperatingHoursConfig();
    const weekly = {};

    WEEK_DAYS.forEach((day) => {
        weekly[day.value] = normalizeSchedule(config?.weekly?.[day.value] || fallback.weekly[day.value]);
    });

    return {
        minAdvanceMinutes: Number(config?.minAdvanceMinutes || fallback.minAdvanceMinutes),
        slotIntervalMinutes: Number(config?.slotIntervalMinutes || fallback.slotIntervalMinutes),
        weekly
    };
}

export async function getOperatingHoursConfig() {
    const config = await getValue(OPERATING_CONFIG_PATH);

    return normalizeOperatingHoursConfig(config || getDefaultOperatingHoursConfig());
}

export async function saveOperatingHoursConfig(config) {
    const normalizedConfig = normalizeOperatingHoursConfig(config);

    await setValue(OPERATING_CONFIG_PATH, {
        ...normalizedConfig,
        updatedAt: createTimestamp()
    });

    return normalizedConfig;
}

export async function getOperatingHourExceptions() {
    const exceptions = await getCollection(OPERATING_EXCEPTIONS_PATH);

    return exceptions.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveOperatingHourException(exception) {
    const normalizedException = {
        date: exception.date,
        reason: exception.reason || '',
        ...normalizeSchedule(exception),
        updatedAt: createTimestamp()
    };

    return setById(OPERATING_EXCEPTIONS_PATH, normalizedException.date, normalizedException);
}

export async function removeOperatingHourException(date) {
    return removeById(OPERATING_EXCEPTIONS_PATH, date);
}

export function getScheduleForDate(date, config, exceptions = []) {
    const exception = exceptions.find((item) => item.date === date);

    if (exception) {
        return normalizeSchedule(exception);
    }

    return normalizeSchedule(config.weekly[getWeekDay(date)] || { open: false, shifts: [] });
}

export function getReservationSlotsForDate(date, config, exceptions = [], now = new Date(), people = 1) {
    const schedule = getScheduleForDate(date, config, exceptions);

    if (!schedule.open) {
        return { slots: [], reason: 'Não há horários disponíveis para esta data. Escolha outro dia.' };
    }

    const interval = Number(config.slotIntervalMinutes || SLOT_INTERVAL_MINUTES);
    const today = getLocalDateKey(now);
    const minimumTodayMinutes = (now.getHours() * 60) + now.getMinutes() + Number(config.minAdvanceMinutes || MIN_ADVANCE_MINUTES);
    const minimumSlotMinutes = date === today ? roundUpToInterval(minimumTodayMinutes, interval) : 0;
    const durationMinutes = getReservationDurationMinutes(people);
    const slots = [];

    schedule.shifts.forEach((shift) => {
        const start = timeToMinutes(shift.start);
        const end = timeToMinutes(shift.end);

        if (start === null || end === null) {
            return;
        }

        for (let minutes = start; minutes + durationMinutes <= end; minutes += interval) {
            if (minutes >= minimumSlotMinutes) {
                slots.push(minutesToTime(minutes));
            }
        }
    });

    return {
        slots,
        reason: slots.length ? '' : 'Não há horários disponíveis para esta data. Escolha outro dia.'
    };
}

export function isTimeAllowedForPeople(date, time, people, config, exceptions = [], now = new Date()) {
    return getReservationSlotsForDate(date, config, exceptions, now, people).slots.includes(time);
}

export function isReservationPeriodInsideOperatingSchedule(date, time, durationMinutes, config, exceptions = []) {
    const schedule = getScheduleForDate(date, config, exceptions);
    const startMinutes = timeToMinutes(time);

    if (!schedule.open || startMinutes === null) {
        return false;
    }

    const endMinutes = startMinutes + Number(durationMinutes);

    return schedule.shifts.some((shift) => {
        const shiftStart = timeToMinutes(shift.start);
        const shiftEnd = timeToMinutes(shift.end);

        return shiftStart !== null
            && shiftEnd !== null
            && startMinutes >= shiftStart
            && endMinutes <= shiftEnd;
    });
}

export function getReservationPeriod(reservation) {
    const startMinutes = timeToMinutes(reservation.horario);
    const durationMinutes = Number(reservation.duracaoMinutos || getReservationDurationMinutes(reservation.pessoas));
    const endMinutes = startMinutes === null ? null : (timeToMinutes(reservation.fimPrevisto) ?? (startMinutes + durationMinutes));

    return {
        startMinutes,
        endMinutes,
        durationMinutes,
        endTime: endMinutes === null ? null : (reservation.fimPrevisto || minutesToTime(endMinutes))
    };
}

export function hasTimeOverlap(firstStart, firstEnd, secondStart, secondEnd) {
    return firstStart < secondEnd && secondStart < firstEnd;
}

export function hasReservationConflictForPeriod({ mesaId, data, horario, pessoas }, reservations) {
    const startMinutes = timeToMinutes(horario);

    if (startMinutes === null) {
        return false;
    }

    const endMinutes = startMinutes + getReservationDurationMinutes(pessoas);

    return reservations.some((reservation) => {
        if (reservation.mesaId !== mesaId || reservation.data !== data || reservation.status !== 'ativa') {
            return false;
        }

        const period = getReservationPeriod(reservation);

        if (period.startMinutes === null || period.endMinutes === null) {
            return false;
        }

        return hasTimeOverlap(startMinutes, endMinutes, period.startMinutes, period.endMinutes);
    });
}

export function hasReservationOutsideSchedule(reservations, config, exceptions = []) {
    return reservations.find((reservation) => {
        const durationMinutes = Number(reservation.duracaoMinutos || getReservationDurationMinutes(reservation.pessoas));

        return !isReservationPeriodInsideOperatingSchedule(reservation.data, reservation.horario, durationMinutes, config, exceptions);
    }) || null;
}

export { OPERATING_HOURS_PATH, OPERATING_CONFIG_PATH, OPERATING_EXCEPTIONS_PATH, WEEK_DAYS };
