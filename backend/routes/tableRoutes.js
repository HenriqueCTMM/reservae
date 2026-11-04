const express = require('express');
const createTableController = require('../controllers/tableController');

module.exports = function createTableRoutes(Table, requireProfile) {
    const router = express.Router();
    const tableController = createTableController(Table);

    router.get('/', tableController.getTables);
    router.post('/', requireProfile('admin'), tableController.postTable);
    router.patch('/:id', requireProfile('admin'), tableController.patchTable);

    return router;
};
