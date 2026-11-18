const viewFormatting = require('../utils/viewFormatting');
const { getRestaurantDateTime } = require('../utils/dateTime');
const { publicMessage } = require('../utils/messageResponse');

module.exports = function createClientPageController({ Reservation, Message }) {
    return {
        getNewReservation(req, res) {
            res.render('cliente/reservas', {
                title: 'Reservaê | Reserva de mesas', minDate: getRestaurantDateTime().slice(0, 10)
            });
        },

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
            const [history, options] = await Promise.allSettled([
                Message.findByUser(req.user.id), Reservation.findByUser(req.user.id)
            ]);
            const historyError = history.status === 'rejected' ? 'Não foi possível carregar as mensagens. Tente recarregar.' : '';
            const reservationOptionsError = options.status === 'rejected' ? 'Não foi possível carregar suas reservas. Você ainda pode enviar uma mensagem geral.' : '';
            if (historyError) console.error('Erro no histórico de mensagens:', history.reason.message);
            if (reservationOptionsError) console.error('Erro ao listar reservas para contato:', options.reason.message);
            const reservations = options.value || [];
            const selectedReservation = reservations.find((reservation) => String(reservation.id) === req.query.reserva);
            const reservationNotice = req.query.reserva !== undefined && !selectedReservation && !reservationOptionsError
                ? 'A reserva informada não está entre as suas reservas. Escolha outra ou envie uma mensagem geral.' : '';
            res.status(historyError || reservationOptionsError ? 500 : 200).render('cliente/contato', {
                title: 'Reservaê | Contato', messages: (history.value || []).map(publicMessage), historyError,
                reservations, selectedReservation, reservationOptionsError, reservationNotice, ...viewFormatting
            });
        }
    };
};
