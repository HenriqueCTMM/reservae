const express = require('express');
const createMessageController = require('../controllers/messageController');

module.exports = function createMessageRoutes(Message, requireProfile) {
    const router = express.Router();
    const controller = createMessageController(Message);
    router.get('/mine', requireProfile('cliente'), controller.getMyMessages);
    router.post('/', requireProfile('cliente'), controller.createMessage);
    router.get('/', requireProfile('admin'), controller.getMessages);
    router.patch('/:id/reply', requireProfile('admin'), controller.updateMessageReply);
    return router;
};
