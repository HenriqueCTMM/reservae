const express = require('express');
const createReservationController = require('../controllers/reservationController');

module.exports = function createReservationRoutes(Reservation, requireProfile) {
    const router = express.Router();
    const controller = createReservationController(Reservation);
    router.get('/mine', requireProfile('cliente'), controller.getMyReservations);
    router.get('/', requireProfile('admin'), controller.getReservations);
    router.patch('/:id/status', requireProfile('admin'), controller.updateReservationStatus);
    router.post('/', requireProfile('cliente'), controller.createReservation);
    return router;
};
