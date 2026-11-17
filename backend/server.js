require('./config/env');
const { serverSettings } = require('./config/settings');

async function main() {
    const { port } = serverSettings();
    const pool = require('./config/database');
    let sessionStore;
    let server;
    let stopping = false;

    async function closeResources() {
        try {
            if (sessionStore) await sessionStore.close();
        } finally {
            await pool.end();
        }
    }

    async function shutdown(signal) {
        if (stopping) return;
        stopping = true;
        console.log(`${signal}: encerrando o servidor e aguardando requisições em andamento.`);
        const deadline = setTimeout(() => {
            console.error('Tempo limite de encerramento excedido.');
            process.exit(1);
        }, 25000);
        deadline.unref();
        try {
            await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
            await closeResources();
        } catch (error) {
            console.error('Erro ao encerrar:', error.message);
            process.exitCode = 1;
        } finally {
            clearTimeout(deadline);
        }
    }

    try {
        // Falha antes de abrir a porta se o banco/schema de sessões não estiver pronto.
        await pool.query('SELECT session_id, expires, data FROM sessions LIMIT 0');
        const { createSessionStore } = require('./config/sessionStore');
        sessionStore = createSessionStore(pool);
        await sessionStore.onReady();
        const { createApp } = require('./app');
        const app = createApp(sessionStore);
        server = await new Promise((resolve, reject) => {
            const listener = app.listen(port, '0.0.0.0', () => resolve(listener));
            listener.once('error', reject);
        });
        process.once('SIGTERM', () => shutdown('SIGTERM'));
        process.once('SIGINT', () => shutdown('SIGINT'));
        console.log(`Reservaê ouvindo em 0.0.0.0:${port}`);
    } catch (error) {
        await closeResources();
        throw error;
    }
}

main().catch((error) => {
    console.error('Falha ao iniciar a aplicação:', error.message);
    process.exitCode = 1;
});
