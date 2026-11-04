const express = require('express');
const createAvailabilityController = require('../controllers/availabilityController');

module.exports = function createAvailabilityRoutes(Availability) {
    const router = express.Router();
    const controller = createAvailabilityController(Availability);
    router.get('/', controller.getAvailability);
    return router;
};
