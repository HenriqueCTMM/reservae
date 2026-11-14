const express = require('express');
const createReportController = require('../controllers/reportController');

module.exports = function createReportRoutes(Report, requireProfile) {
    const router = express.Router();
    const controller = createReportController(Report);
    router.get('/reservations', requireProfile('admin'), controller.getReservationsReport);
    return router;
};
