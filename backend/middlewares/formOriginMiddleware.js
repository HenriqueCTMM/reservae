module.exports = function requireSameOrigin(req, res, next) {
    const origin = req.get('Origin');
    const expectedOrigin = `${req.protocol}://${req.get('Host')}`;
    if (req.get('Sec-Fetch-Site') === 'cross-site' || (origin && origin !== expectedOrigin)) {
        res.set('Cache-Control', 'no-store');
        return res.status(403).render('errors/error', {
            title: 'Reservaê | Acesso negado',
            status: 403,
            message: 'Envie o formulário a partir do próprio site.'
        });
    }
    next();
};
