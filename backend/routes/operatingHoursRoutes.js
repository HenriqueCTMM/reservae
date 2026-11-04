const express = require('express');
const createOperatingHoursController = require('../controllers/operatingHoursController');

module.exports = function createOperatingHoursRoutes(OperatingHours) {
    const router = express.Router();
    const operatingHoursController = createOperatingHoursController(OperatingHours);

    router.get('/', operatingHoursController.getOperatingHours);

    return router;
};
