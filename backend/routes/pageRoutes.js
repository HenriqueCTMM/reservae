const express = require('express');
const createPageController = require('../controllers/pageController');
const createClientPageController = require('../controllers/clientPageController');
const createAdminPageController = require('../controllers/adminPageController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const requireSameOrigin = require('../middlewares/formOriginMiddleware');

module.exports = function createPageRoutes(User, { Reservation, Message, Report, Table, OperatingHours }) {
    const router = express.Router();
    const page = createPageController(User);
    const clientPage = createClientPageController({ Reservation, Message });
    const adminPage = createAdminPageController({ Reservation, Message, Report, Table, OperatingHours });
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

    router.get('/reservas', loadPageUser, requirePageAuth, requirePageProfile('cliente'), clientPage.getNewReservation);
    router.get('/pages/reservas.html', (req, res) => res.redirect('/reservas'));
    router.get('/minhas-reservas', loadPageUser, requirePageAuth, requirePageProfile('cliente'), clientPage.getMyReservations);
    router.get('/contato', loadPageUser, requirePageAuth, requirePageProfile('cliente'), clientPage.getContact);
    router.get('/pages/minhas-reservas.html', (req, res) => res.redirect('/minhas-reservas'));
    router.get('/pages/contato.html', (req, res) => res.redirect('/contato'));
    router.get('/admin/mesas', loadPageUser, requirePageAuth, requirePageProfile('admin'), adminPage.getTables);
    router.get('/pages/admin.html', (req, res) => res.redirect('/admin/mesas'));
    router.get('/admin/reservas', loadPageUser, requirePageAuth, requirePageProfile('admin'), adminPage.getReservations);
    router.get('/admin/mensagens', loadPageUser, requirePageAuth, requirePageProfile('admin'), adminPage.getMessages);
    router.get('/pages/admin-reservas.html', (req, res) => res.redirect('/admin/reservas'));
    router.get('/pages/admin-mensagens.html', (req, res) => res.redirect('/admin/mensagens'));
    router.get('/admin/configuracoes', loadPageUser, requirePageAuth, requirePageProfile('admin'), adminPage.getSettings);
    router.get('/pages/admin-configuracoes.html', (req, res) => res.redirect('/admin/configuracoes'));

    router.use(page.getNotFound);

    return router;
};
