const createAuthService = require('../services/authService');
const publicProfile = require('../utils/publicProfile');
const { startSession, endSession } = require('../utils/session');

module.exports = function createAuthController(User) {
    const authService = createAuthService(User);

    return {
        async postRegister(req, res, next) {
            try {
                await authService.register(req.body);
                res.status(201).json({ message: 'Cadastro criado com sucesso. Entre com seu e-mail e senha.' });
            } catch (error) {
                if ([400, 409].includes(error.status)) {
                    return res.status(error.status).json({ message: error.message });
                }
                next(error);
            }
        },

        async postLogin(req, res, next) {
            try {
                const user = await authService.authenticate(req.body);
                await startSession(req, user);
                res.json(publicProfile(user));
            } catch (error) {
                if ([400, 401].includes(error.status)) {
                    return res.status(error.status).json({ message: error.message });
                }
                next(error);
            }
        },

        getMe(req, res) {
            res.json(publicProfile(req.user));
        },

        async logout(req, res, next) {
            try {
                await endSession(req, res);
                res.json({ message: 'Você saiu da sua conta.' });
            } catch (error) {
                next(error);
            }
        }
    };
};
