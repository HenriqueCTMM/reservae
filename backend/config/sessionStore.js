const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;

function createSessionStore(pool) {
    const store = new MySQLStore({
        // O agendamento interno da biblioteca não captura rejeições de consultas.
        clearExpired: false,
        createDatabaseTable: false,
        endConnectionOnClose: false,
        expiration: SESSION_MAX_AGE,
        // O cookie mantém o vencimento original de oito horas, sem renovação por acesso.
        disableTouch: true
    }, pool);
    const cleanup = setInterval(() => {
        store.clearExpiredSessions().catch((error) => {
            console.error('Erro ao remover sessões expiradas:', error.message);
        });
    }, 15 * 60 * 1000);
    cleanup.unref();
    const close = store.close.bind(store);
    store.close = async () => {
        clearInterval(cleanup);
        await close();
    };
    return store;
}

module.exports = { createSessionStore, SESSION_MAX_AGE };
