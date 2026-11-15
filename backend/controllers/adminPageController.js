const viewFormatting = require('../utils/viewFormatting');
const { publicMessage } = require('../utils/messageResponse');

async function loadSection(load, message) {
    try {
        return { data: await load(), error: '' };
    } catch (error) {
        console.error(message, error.message);
        return { data: null, error: message };
    }
}

module.exports = function createAdminPageController({ Reservation, Message, Report }) {
    return {
        async getMessages(req, res) {
            const result = await loadSection(() => Message.findAll(), 'Não foi possível carregar as mensagens. Clique em Atualizar mensagens para tentar novamente.');
            res.status(result.error ? 500 : 200).render('admin/mensagens', {
                title: 'Reservaê | Mensagens administrativas',
                messages: result.data ? result.data.map(publicMessage) : [],
                messagesError: result.error, ...viewFormatting
            });
        },

        async getReservations(req, res) {
            // Os filtros são aplicados pelas APIs após a carga inicial, sempre independentes.
            const filters = { startDate: null, endDate: null, status: null, search: '' };
            const [list, report] = await Promise.all([
                loadSection(() => Reservation.findAll({ data: '', status: '', search: '' }), 'Não foi possível carregar as reservas. Clique em Atualizar para tentar novamente.'),
                loadSection(() => Report.getReservations(filters), 'Não foi possível carregar o relatório. Clique em Gerar / atualizar relatório para tentar novamente.')
            ]);
            res.status(list.error || report.error ? 500 : 200).render('admin/reservas', {
                title: 'Reservaê | Reservas administrativas',
                reservations: list.data || [], reservationsError: list.error,
                report: report.data ? { ...report.data, filters } : null,
                reportError: report.error, ...viewFormatting
            });
        }
    };
};
