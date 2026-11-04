const { timeToMinutes, minutesToTime } = require('./dateTime');

function getReservationDurationMinutes(people) {
    if (people >= 5) return 150;
    if (people >= 3) return 120;
    return 90;
}

function getAllowedSlots(date, schedule, durationMinutes, now) {
    if (!schedule.aberto) return [];

    // As duas datas representam o relógio local do restaurante. UTC evita usar o fuso do computador.
    const dayStart = Date.parse(`${date}T00:00:00Z`);
    const minimumStart = Date.parse(`${now.replace(' ', 'T')}Z`) + schedule.min_advance_minutes * 60000;
    const slots = [];
    const shifts = [
        [schedule.inicio_turno_1, schedule.fim_turno_1],
        [schedule.inicio_turno_2, schedule.fim_turno_2]
    ];
    for (const [start, end] of shifts) {
        if (start === null || end === null) continue;
        const endMinutes = timeToMinutes(end);
        for (let minutes = timeToMinutes(start); minutes + durationMinutes <= endMinutes;
            minutes += schedule.slot_interval_minutes) {
            if (dayStart + minutes * 60000 >= minimumStart) slots.push(minutesToTime(minutes));
        }
    }
    return slots;
}

module.exports = { getReservationDurationMinutes, getAllowedSlots };
