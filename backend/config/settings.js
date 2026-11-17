const fs = require('node:fs');

function integer(value, fallback, name, max) {
    const number = value === undefined ? fallback : Number(value);
    if (!Number.isInteger(number) || number < 1 || number > max) {
        throw new Error(`${name} deve ser um inteiro entre 1 e ${max}.`);
    }
    return number;
}

function connectionSettings(env = process.env) {
    const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    if (env.NODE_ENV === 'production') required.push('DB_HOST');
    for (const name of required) {
        if (!env[name]?.trim()) throw new Error(`Configure ${name} nas variáveis de ambiente.`);
    }
    if (env.DB_SSL !== undefined && !['true', 'false'].includes(env.DB_SSL)) {
        throw new Error('DB_SSL deve ser true ou false.');
    }
    if (env.DB_SSL_CA && env.DB_SSL_CA_FILE) {
        throw new Error('Use somente DB_SSL_CA ou DB_SSL_CA_FILE.');
    }
    if ((env.DB_SSL_CA || env.DB_SSL_CA_FILE) && env.DB_SSL !== 'true') {
        throw new Error('Configure DB_SSL=true para utilizar o certificado CA.');
    }

    let ssl;
    if (env.DB_SSL === 'true') {
        const ca = env.DB_SSL_CA_FILE
            ? fs.readFileSync(env.DB_SSL_CA_FILE, 'utf8')
            : env.DB_SSL_CA?.replace(/\\n/g, '\n');
        ssl = { rejectUnauthorized: true, verifyIdentity: true, ...(ca ? { ca } : {}) };
    }
    return {
        host: env.DB_HOST || '127.0.0.1',
        port: integer(env.DB_PORT, 3306, 'DB_PORT', 65535),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        charset: 'utf8mb4',
        connectTimeout: 10000,
        ...(ssl ? { ssl } : {})
    };
}

function databaseSettings(env = process.env) {
    return {
        ...connectionSettings(env),
        waitForConnections: true,
        connectionLimit: integer(env.DB_CONNECTION_LIMIT, 10, 'DB_CONNECTION_LIMIT', 100)
    };
}

function serverSettings(env = process.env) {
    if (!env.SESSION_SECRET?.trim()) {
        throw new Error('Configure SESSION_SECRET nas variáveis de ambiente.');
    }
    const production = env.NODE_ENV === 'production';
    if (production && (env.SESSION_SECRET.length < 32
        || env.SESSION_SECRET === 'troque-por-uma-chave-aleatoria-longa')) {
        throw new Error('SESSION_SECRET deve ser uma chave aleatória com pelo menos 32 caracteres em produção.');
    }
    return {
        port: integer(env.PORT, 3000, 'PORT', 65535),
        sessionSecret: env.SESSION_SECRET,
        production
    };
}

module.exports = { connectionSettings, databaseSettings, serverSettings };
