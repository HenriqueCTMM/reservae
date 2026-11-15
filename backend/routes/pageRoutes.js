const express = require('express');
const createPageController = require('../controllers/pageController');

module.exports = function createPageRoutes() {
    const router = express.Router();
    const pageController = createPageController();

    router.get('/login', pageController.getLogin);

    return router;
};
