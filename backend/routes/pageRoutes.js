const express = require('express');
const createPageController = require('../controllers/pageController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const requireSameOrigin = require('../middlewares/formOriginMiddleware');

module.exports = function createPageRoutes(User) {
    const router = express.Router();
    const page = createPageController(User);
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
    router.get('/pages/minhas-reservas.html', loadPageUser, requirePageAuth, requirePageProfile('cliente'), page.legacyPage('minhas-reservas.html'));
    router.get('/pages/contato.html', loadPageUser, requirePageAuth, requirePageProfile('cliente'), page.legacyPage('contato.html'));
    router.get('/pages/admin.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin.html'));
    router.get('/pages/admin-reservas.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin-reservas.html'));
    router.get('/pages/admin-mensagens.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin-mensagens.html'));
    router.get('/pages/admin-configuracoes.html', loadPageUser, requirePageAuth, requirePageProfile('admin'), page.legacyPage('admin-configuracoes.html'));

    return router;
};
