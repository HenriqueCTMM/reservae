const express = require('express');
const createOperatingHoursController = require('../controllers/operatingHoursController');

module.exports = function createOperatingHoursRoutes(OperatingHours, requireProfile) {
    const router = express.Router();
    const operatingHoursController = createOperatingHoursController(OperatingHours);

    router.get('/', operatingHoursController.getOperatingHours);
    router.get('/exceptions', operatingHoursController.getExceptions);
    router.put('/', requireProfile('admin'), operatingHoursController.putOperatingHours);
    router.put('/exceptions/:date', requireProfile('admin'), operatingHoursController.putException);
    router.delete('/exceptions/:date', requireProfile('admin'), operatingHoursController.deleteException);

    return router;
};
