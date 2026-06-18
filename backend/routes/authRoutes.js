const express = require('express');
const createAuthController = require('../controllers/authController');

module.exports = function createAuthRoutes(User) {
    const router = express.Router();
    const authController = createAuthController(User);

    router.post('/register', authController.postRegister);
    router.post('/login', authController.postLogin);
    router.get('/me', authController.getMe);
    router.post('/logout', authController.logout);

    return router;
};
