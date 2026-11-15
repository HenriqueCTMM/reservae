const path = require('node:path');
const createAuthService = require('../services/authService');
const { saveSession, startSession, endSession } = require('../utils/session');

function homeUrl(user) {
    return user?.perfil === 'admin' ? '/pages/admin.html' : '/pages/reservas.html';
}

function formFields(body) {
    return {
        nome: typeof body?.nome === 'string' ? body.nome.trim() : '',
        email: typeof body?.email === 'string' ? body.email.trim() : ''
    };
}

module.exports = function createPageController(User) {
    const authService = createAuthService(User);

    return {
        getHome(req, res) {
            res.redirect(req.user ? homeUrl(req.user) : '/login');
        },

        redirectAuthenticated(req, res, next) {
            if (req.user) return res.redirect(req.method === 'POST' ? 303 : 302, homeUrl(req.user));
            next();
        },

        async getLogin(req, res, next) {
            try {
                const success = req.session?.success || '';
                if (success) {
                    delete req.session.success;
                    await saveSession(req);
                }
                res.render('auth/login', {
                    title: 'Reservaê | Login', fields: formFields(), error: '', success
                });
            } catch (error) {
                next(error);
            }
        },

        getRegister(req, res) {
            res.render('auth/cadastro', {
                title: 'Reservaê | Cadastro', fields: formFields(), error: '', success: ''
            });
        },

        async postLogin(req, res, next) {
            try {
                const user = await authService.authenticate(req.body);
                await startSession(req, user);
                res.redirect(303, homeUrl(user));
            } catch (error) {
                if ([400, 401].includes(error.status)) {
                    return res.status(error.status).render('auth/login', {
                        title: 'Reservaê | Login', fields: formFields(req.body), error: error.message, success: ''
                    });
                }
                next(error);
            }
        },

        async postRegister(req, res, next) {
            try {
                await authService.register(req.body);
                req.session.success = 'Cadastro criado com sucesso. Entre com seu e-mail e senha.';
                await saveSession(req);
                res.redirect(303, '/login');
            } catch (error) {
                if ([400, 409].includes(error.status)) {
                    return res.status(error.status).render('auth/cadastro', {
                        title: 'Reservaê | Cadastro', fields: formFields(req.body), error: error.message, success: ''
                    });
                }
                next(error);
            }
        },

        async postLogout(req, res, next) {
            try {
                await endSession(req, res);
                res.redirect(303, '/login');
            } catch (error) {
                next(error);
            }
        },

        legacyPage(filename) {
            // O nome é definido exclusivamente pelas rotas explícitas, nunca pelo usuário.
            return (req, res, next) => {
                res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', filename),
                    { cacheControl: false }, (error) => {
                        if (error) next(error);
                    });
            };
        }
    };
};
