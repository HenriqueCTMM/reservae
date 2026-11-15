module.exports = function createPageController() {
    return {
        getLogin(req, res) {
            res.render('auth/login', { title: 'Reservaê | Login' });
        }
    };
};
