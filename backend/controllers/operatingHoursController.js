module.exports = function createOperatingHoursController(OperatingHours) {
    return {
        async getOperatingHours(req, res, next) {
            if (Object.keys(req.query).length > 0) {
                return res.status(400).json({ message: 'A consulta de horários de funcionamento não aceita filtros.' });
            }

            try {
                const days = await OperatingHours.findWeekly();
                const weekly = {};
                for (const day of days) {
                    const open = Boolean(day.aberto);
                    const shifts = [];
                    if (open) {
                        shifts.push({ start: day.inicio_turno_1, end: day.fim_turno_1 });
                        if (day.inicio_turno_2 !== null) {
                            shifts.push({ start: day.inicio_turno_2, end: day.fim_turno_2 });
                        }
                    }
                    weekly[day.dia_semana] = { open, shifts };
                }

                res.json({
                    minAdvanceMinutes: days[0].min_advance_minutes,
                    slotIntervalMinutes: days[0].slot_interval_minutes,
                    weekly,
                    updatedAt: Math.max(...days.map((day) => Number(day.updated_at_ms)))
                });
            } catch (error) {
                next(error);
            }
        }
    };
};
