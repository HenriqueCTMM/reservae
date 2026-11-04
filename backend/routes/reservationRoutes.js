const express = require('express');
const createReservationController = require('../controllers/reservationController');

module.exports = function createReservationRoutes(Reservation, requireProfile) {
    const router = express.Router();
    const controller = createReservationController(Reservation);
    router.post('/', requireProfile('cliente'), controller.createReservation);
    return router;
};
