const express = require('express');
const createOperatingHoursController = require('../controllers/operatingHoursController');

module.exports = function createOperatingHoursRoutes(OperatingHours, requireProfile) {
    const router = express.Router();
    const operatingHoursController = createOperatingHoursController(OperatingHours);

    router.get('/', operatingHoursController.getOperatingHours);
    router.get('/exceptions', operatingHoursController.getExceptions);
    router.put('/', requireProfile('admin'), operatingHoursController.putOperatingHours);

    return router;
};
