function publicSchedule(schedule) {
    const open = Boolean(schedule.aberto);
    const shifts = [];
    if (open) {
        shifts.push({ start: schedule.inicio_turno_1, end: schedule.fim_turno_1 });
        if (schedule.inicio_turno_2 !== null) {
            shifts.push({ start: schedule.inicio_turno_2, end: schedule.fim_turno_2 });
        }
    }
    return { open, shifts };
}

function publicOperatingHours(days) {
    const weekly = {};
    for (const day of days) {
        weekly[day.dia_semana] = publicSchedule(day);
    }
    return {
        minAdvanceMinutes: days[0].min_advance_minutes,
        slotIntervalMinutes: days[0].slot_interval_minutes,
        weekly,
        updatedAt: Math.max(...days.map((day) => Number(day.updated_at_ms)))
    };
}

function publicException(exception) {
    return {
        id: exception.data,
        date: exception.data,
        ...publicSchedule(exception),
        reason: exception.motivo,
        updatedAt: Number(exception.updated_at_ms)
    };
}

module.exports = { publicOperatingHours, publicException };
