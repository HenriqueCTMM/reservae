require('./config/env');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const createAuthRoutes = require('./routes/authRoutes');
const createTableRoutes = require('./routes/tableRoutes');
const createAuthMiddleware = require('./middlewares/authMiddleware');

function createApp({
    User = require('./models/user'),
    Table = require('./models/table'),
    sessionSecret = process.env.SESSION_SECRET
} = {}) {
    if (!sessionSecret) throw new Error('Configure SESSION_SECRET em backend/.env.');

    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '16kb' }));
    app.use('/api', session({
        name: 'reservae.sid',
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000
        }
    }));
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });
    app.use('/api/auth', createAuthRoutes(User));
    const { requireAuth, requireProfile } = createAuthMiddleware(User);
    app.use('/api', requireAuth);
    app.use('/api/tables', createTableRoutes(Table, requireProfile));
    app.use('/api', (req, res) => {
        res.status(404).json({ message: 'Endpoint não implementado nesta etapa.' });
    });
    app.use(express.static(path.join(__dirname, '..', 'frontend', 'src')));
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ message: 'O corpo da requisição deve ser um JSON válido.' });
        }
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ message: 'A requisição excede o tamanho permitido.' });
        }
        console.error('Erro na API:', error.message);
        res.status(500).json({ message: 'Não foi possível concluir a operação. Tente novamente.' });
    });
    return app;
}

module.exports = { createApp };
