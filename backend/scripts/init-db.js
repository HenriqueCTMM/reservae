const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../config/database');

async function main() {
    try {
        const sql = await fs.readFile(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Tabela de usuários criada com sucesso.');
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('Erro ao inicializar o banco:', error.message);
    process.exitCode = 1;
});
