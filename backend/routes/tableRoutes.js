const express = require('express');
const createTableController = require('../controllers/tableController');

module.exports = function createTableRoutes(Table) {
    const router = express.Router();
    const tableController = createTableController(Table);

    router.get('/', tableController.getTables);

    return router;
};
