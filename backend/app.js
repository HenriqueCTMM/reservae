require('./config/env');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const User = require('./models/user');
const Table = require('./models/table');
const OperatingHours = require('./models/operatingHours');
const Availability = require('./models/availability');
const Reservation = require('./models/reservation');
const Message = require('./models/message');
const Report = require('./models/report');
const createAuthRoutes = require('./routes/authRoutes');
const createTableRoutes = require('./routes/tableRoutes');
const createOperatingHoursRoutes = require('./routes/operatingHoursRoutes');
const createAvailabilityRoutes = require('./routes/availabilityRoutes');
const createReservationRoutes = require('./routes/reservationRoutes');
const createMessageRoutes = require('./routes/messageRoutes');
const createReportRoutes = require('./routes/reportRoutes');
const createPageRoutes = require('./routes/pageRoutes');
const createAuthMiddleware = require('./middlewares/authMiddleware');
const { SESSION_MAX_AGE } = require('./config/sessionStore');
const { serverSettings } = require('./config/settings');
const checkHealth = require('./config/healthCheck');

function createApp(sessionStore) {
    const { production, sessionSecret } = serverSettings();

    const app = express();
    app.disable('x-powered-by');
    if (production) app.set('trust proxy', 1);
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.locals.user = null;
    // Independente de autenticação e da leitura/gravação de sessões.
    app.get('/health', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            await checkHealth();
            res.json({ status: 'ok' });
        } catch (error) {
            console.error('Falha no health check:', error.message);
            res.status(503).json({ status: 'unavailable' });
        }
    });
    app.use(express.json({ limit: '16kb' }));
    app.use(session({
        name: 'reservae.sid',
        secret: sessionSecret,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'strict',
            secure: production,
            maxAge: SESSION_MAX_AGE
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
    app.use('/api/operating-hours', createOperatingHoursRoutes(OperatingHours, requireProfile));
    app.use('/api/availability', createAvailabilityRoutes(Availability));
    app.use('/api/reservations', createReservationRoutes(Reservation, requireProfile));
    app.use('/api/messages', createMessageRoutes(Message, requireProfile));
    app.use('/api/reports', createReportRoutes(Report, requireProfile));
    app.use('/api', (req, res) => {
        res.status(404).json({ message: 'Endpoint não encontrado.' });
    });
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(createPageRoutes(User, { Reservation, Message, Report, Table, OperatingHours }));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        res.set('Cache-Control', 'no-store');
        const isApi = req.path === '/api' || req.path.startsWith('/api/');
        if (!isApi) {
            const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
            const message = status === 413 ? 'A requisição excede o tamanho permitido.'
                : status === 400 ? 'Não foi possível ler os dados enviados.'
                    : 'Não foi possível concluir a operação. Tente novamente.';
            if (status === 500) console.error('Erro na página:', error.message);
            res.set('Cache-Control', 'no-store');
            return res.status(status).render('errors/error', { title: 'Reservaê | Erro', status, message });
        }
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
