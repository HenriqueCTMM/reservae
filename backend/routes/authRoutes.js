const express = require('express');
const createAuthController = require('../controllers/authController');
const createAuthMiddleware = require('../middlewares/authMiddleware');

module.exports = function createAuthRoutes(User) {
    const router = express.Router();
    const authController = createAuthController(User);
    const { requireAuth } = createAuthMiddleware(User);

    router.post('/register', authController.postRegister);
    router.post('/login', authController.postLogin);
    router.get('/me', requireAuth, authController.getMe);
    router.post('/logout', authController.logout);

    return router;
};
