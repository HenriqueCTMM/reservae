const { promisify } = require('node:util');

async function saveSession(req) {
    await promisify(req.session.save).call(req.session);
}

async function startSession(req, user) {
    await promisify(req.session.regenerate).call(req.session);
    req.session.isLoggedIn = true;
    req.session.userId = user.id;
    await saveSession(req);
}

async function endSession(req, res) {
    await promisify(req.session.destroy).call(req.session);
    res.clearCookie('reservae.sid', { path: '/' });
}

module.exports = { saveSession, startSession, endSession };
