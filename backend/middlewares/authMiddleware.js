module.exports = function createAuthMiddleware(User) {
    async function requireAuth(req, res, next) {
        if (!req.session?.isLoggedIn || !req.session.userId) {
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

            // A identidade e o perfil vêm do banco, nunca do corpo da requisição.
            req.user = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
            next();
        } catch (error) {
            next(error);
        }
    }

    function requireProfile(perfil) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ message: 'Entre para continuar.' });
            }
            if (req.user.perfil !== perfil) {
                return res.status(403).json({ message: 'Você não tem permissão para acessar este recurso.' });
            }
            next();
        };
    }

    return { requireAuth, requireProfile };
};
