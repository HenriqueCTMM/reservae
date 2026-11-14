const { isDate } = require('../utils/dateTime');
const { publicReservation } = require('../utils/reservationResponse');

module.exports = function createReportController(Report) {
    return {
        async getReservationsReport(req, res, next) {
            if (Object.keys(req.query).some((field) => !['startDate', 'endDate', 'status', 'search'].includes(field))
                || Object.values(req.query).some((value) => typeof value !== 'string')
                || req.get('Transfer-Encoding') !== undefined || Number(req.get('Content-Length') || 0) > 0) {
                return res.status(400).json({ message: 'Envie apenas startDate, endDate, status e search, sem corpo na consulta.' });
            }
            const filters = {
                startDate: req.query.startDate?.trim() || null,
                endDate: req.query.endDate?.trim() || null,
                status: req.query.status?.trim() || null,
                search: req.query.search?.trim() || ''
            };
            if ((filters.startDate && !isDate(filters.startDate)) || (filters.endDate && !isDate(filters.endDate))) {
                return res.status(400).json({ message: 'Informe datas reais em YYYY-MM-DD.' });
            }
            if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
                return res.status(400).json({ message: 'A data inicial não pode ser posterior à data final.' });
            }
            if (filters.status && !['ativa', 'finalizada', 'cancelada', 'nao_compareceu'].includes(filters.status)) {
                return res.status(400).json({ message: 'Informe um status de reserva válido.' });
            }
            if (filters.search.length > 120) {
                return res.status(400).json({ message: 'A busca deve ter até 120 caracteres.' });
            }
            try {
                const report = await Report.getReservations(filters);
                res.json({ filters, totals: report.totals, reservations: report.reservations.map(publicReservation) });
            } catch (error) {
                next(error);
            }
        }
    };
};
