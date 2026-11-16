const viewFormatting = require('../utils/viewFormatting');
const { publicMessage } = require('../utils/messageResponse');
const { publicTable } = require('../utils/tableResponse');
const { publicOperatingHours, publicException } = require('../utils/operatingHoursResponse');

async function loadSection(load, message) {
    try {
        return { data: await load(), error: '' };
    } catch (error) {
        console.error(message, error.message);
        return { data: null, error: message };
    }
}

module.exports = function createAdminPageController({ Reservation, Message, Report, Table, OperatingHours }) {
    return {
        async getTables(req, res) {
            const result = await loadSection(async () => (await Table.findAll()).map(publicTable),
                'Mesas não carregadas. Clique em Recarregar mesas para tentar novamente.');
            const tables = result.data || [];
            res.status(result.error ? 500 : 200).render('admin/mesas', {
                title: 'Reservaê | Painel administrativo', tables, tablesError: result.error,
                nextTableNumber: tables.reduce((highest, table) => Math.max(highest, table.numero), 0) + 1
            });
        },

        async getSettings(req, res) {
            const [weekly, exceptions] = await Promise.all([
                loadSection(async () => publicOperatingHours(await OperatingHours.findWeekly()),
                    'Horários não carregados. Clique em Recarregar horários para tentar novamente.'),
                loadSection(async () => (await OperatingHours.findExceptions()).map(publicException),
                    'Exceções não carregadas. Clique em Recarregar exceções para tentar novamente.')
            ]);
            res.status(weekly.error || exceptions.error ? 500 : 200).render('admin/configuracoes', {
                title: 'Reservaê | Configurações administrativas', operatingConfig: weekly.data,
                weeklyError: weekly.error, exceptions: exceptions.data, exceptionsError: exceptions.error,
                weekDays: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
                ...viewFormatting
            });
        },

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
