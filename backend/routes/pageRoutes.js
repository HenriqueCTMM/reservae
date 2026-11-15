const express = require('express');
const createPageController = require('../controllers/pageController');
const createClientPageController = require('../controllers/clientPageController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const requireSameOrigin = require('../middlewares/formOriginMiddleware');

module.exports = function createPageRoutes(User, { Reservation, Message }) {
    const router = express.Router();
    const page = createPageController(User);
    const clientPage = createClientPageController({ Reservation, Message });
    const { loadPageUser, requirePageAuth, requirePageProfile } = createAuthMiddleware(User);
    const parseForm = express.urlencoded({ extended: false, limit: '16kb' });

    router.get('/', loadPageUser, page.getHome);
    router.get('/index.html', (req, res) => res.redirect('/login'));
    router.get('/pages/cadastro.html', (req, res) => res.redirect('/cadastro'));
    router.get('/login', loadPageUser, page.redirectAuthenticated, page.getLogin);
    router.post('/login', requireSameOrigin, parseForm, loadPageUser, page.redirectAuthenticated, page.postLogin);
    router.get('/cadastro', loadPageUser, page.redirectAuthenticated, page.getRegister);
    router.post('/cadastro', requireSameOrigin, parseForm, loadPageUser, page.redirectAuthenticated, page.postRegister);
    router.post('/logout', requireSameOrigin, parseForm, loadPageUser, requirePageAuth, page.postLogout);

    router.get('/pages/reservas.html', loadPageUser, requirePageAuth, requirePageProfile('cliente'), page.legacyPage('reservas.html'));
    router.get('/minhas-reservas', loadPageUser, requirePageAuth, requirePageProfile('cliente'), clientPage.getMyReservations);
    router.get('/contato', loadPageUser, requirePageAuth, requirePageProfile('cliente'), clientPage.getContact);
    router.get('/pages/minhas-reservas.html', (req, res) => res.redirect('/minhas-reservas'));
    router.get('/pages/contato.html', (req, res) => res.redirect('/contato'));
    router.get('/pages/admin.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin.html'));
    router.get('/pages/admin-reservas.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin-reservas.html'));
    router.get('/pages/admin-mensagens.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin-mensagens.html'));
    router.get('/pages/admin-configuracoes.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin-configuracoes.html'));

    return router;
};
