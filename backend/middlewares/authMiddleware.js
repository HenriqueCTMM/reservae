const publicProfile = require('../utils/publicProfile');
const { endSession } = require('../utils/session');

module.exports = function createAuthMiddleware(User) {
    async function resolveUser(req, res) {
        req.user = null;
        res.locals.user = null;
        if (!req.session?.isLoggedIn || !req.session.userId) return;

        const user = await User.findById(req.session.userId);
        if (!user) {
            await endSession(req, res);
            return;
        }
        // Identidade e perfil vêm do banco; somente o perfil público chega às views.
        req.user = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
        res.locals.user = publicProfile(req.user);
    }

    async function loadPageUser(req, res, next) {
        res.set('Cache-Control', 'no-store');
        try {
            await resolveUser(req, res);
            if (!req.session) return res.redirect(req.method === 'POST' ? 303 : 302, '/login');
            next();
        } catch (error) {
            next(error);
        }
    }

    async function requireAuth(req, res, next) {
        try {
            await resolveUser(req, res);
            if (!req.user) return res.status(401).json({ message: 'Entre para continuar.' });
            next();
        } catch (error) {
            next(error);
        }
    }

    function requireProfile(perfil) {
        return (req, res, next) => {
            if (!req.user) return res.status(401).json({ message: 'Entre para continuar.' });
            if (req.user.perfil !== perfil) {
                return res.status(403).json({ message: 'Você não tem permissão para acessar este recurso.' });
            }
            next();
        };
    }

    function requirePageAuth(req, res, next) {
        if (!req.user) return res.redirect('/login');
        next();
    }

    function requirePageProfile(perfil) {
        return (req, res, next) => {
            if (!req.user) return res.redirect('/login');
            if (req.user.perfil !== perfil) {
                return res.status(403).render('errors/error', {
                    title: 'Reservaê | Acesso negado',
                    status: 403,
                    message: 'Você não tem permissão para acessar esta página.'
                });
            }
            next();
        };
    }

    return { requireAuth, requireProfile, loadPageUser, requirePageAuth, requirePageProfile };
};
