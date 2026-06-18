const bcrypt = require('bcryptjs');

// O frontend usa id no login e uid ao recuperar o perfil da sessão.
function publicProfile(user) {
    return {
        id: String(user.id),
        uid: String(user.id),
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        authProvider: 'password'
    };
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = function createAuthController(User) {
    return {
        async postRegister(req, res, next) {
            const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
            const email = normalizeEmail(req.body?.email);
            const senha = req.body?.senha;

            if (!nome || nome.length > 120 || !validEmail(email)) {
                return res.status(400).json({ message: 'Informe um nome de até 120 caracteres e um e-mail válido.' });
            }
            // bcrypt considera no máximo 72 bytes; rejeitamos senhas que seriam truncadas.
            if (typeof senha !== 'string' || senha.length < 6 || Buffer.byteLength(senha, 'utf8') > 72) {
                return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.' });
            }

            try {
                const hashedPassword = await bcrypt.hash(senha, 12);
                await User.create(nome, email, hashedPassword);
                return res.status(201).json({ message: 'Cadastro criado com sucesso. Entre com seu e-mail e senha.' });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
                }
                next(error);
            }
        },

        async postLogin(req, res, next) {
            const email = normalizeEmail(req.body?.email);
            const senha = req.body?.senha;
            if (!validEmail(email) || typeof senha !== 'string' || !senha || Buffer.byteLength(senha, 'utf8') > 72) {
                return res.status(400).json({ message: 'Informe um e-mail válido e sua senha.' });
            }

            try {
                const user = await User.findByEmail(email);
                if (!user || !(await bcrypt.compare(senha, user.password))) {
                    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
                }

                req.session.regenerate((error) => {
                    if (error) return next(error);
                    req.session.isLoggedIn = true;
                    req.session.userId = user.id;
                    req.session.save((saveError) => {
                        if (saveError) return next(saveError);
                        res.json(publicProfile(user));
                    });
                });
            } catch (error) {
                next(error);
            }
        },

        async getMe(req, res, next) {
            if (!req.session.isLoggedIn) {
                return res.status(401).json({ message: 'Entre para continuar.' });
            }
            try {
                const user = await User.findById(req.session.userId);
                if (!user) {
                    return req.session.destroy((error) => {
                        if (error) return next(error);
                        res.clearCookie('reservae.sid', { path: '/' });
                        res.status(401).json({ message: 'Entre para continuar.' });
                    });
                }
                res.json(publicProfile(user));
            } catch (error) {
                next(error);
            }
        },

        logout(req, res, next) {
            req.session.destroy((error) => {
                if (error) return next(error);
                res.clearCookie('reservae.sid', { path: '/' });
                res.json({ message: 'Você saiu da sua conta.' });
            });
        }
    };
};
