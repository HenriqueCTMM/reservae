const viewFormatting = require('../utils/viewFormatting');

module.exports = function createClientPageController({ Reservation, Message }) {
    return {
        async getMyReservations(req, res) {
            let reservations = [];
            let historyError = '';
            try {
                reservations = await Reservation.findByUser(req.user.id);
            } catch (error) {
                console.error('Erro no histórico de reservas:', error.message);
                historyError = 'Não foi possível carregar suas reservas. Tente recarregar.';
            }
            res.status(historyError ? 500 : 200).render('cliente/minhas-reservas', {
                title: 'Reservaê | Minhas reservas', reservations, historyError, ...viewFormatting
            });
        },

        async getContact(req, res) {
            let messages = [];
            let historyError = '';
            try {
                messages = await Message.findByUser(req.user.id);
            } catch (error) {
                console.error('Erro no histórico de mensagens:', error.message);
                historyError = 'Não foi possível carregar as mensagens. Tente recarregar.';
            }
            res.status(historyError ? 500 : 200).render('cliente/contato', {
                title: 'Reservaê | Contato', messages, historyError, ...viewFormatting
            });
        }
    };
};
