const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../config/database');

async function main() {
    try {
        const sql = await fs.readFile(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
        // O schema usa comandos simples separados por ponto e vírgula.
        // Executar um de cada vez evita habilitar múltiplos comandos no pool da aplicação.
        const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
        for (const statement of statements) {
            await pool.query(statement);
        }
        console.log('Tabelas e configurações básicas inicializadas com sucesso.');
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('Erro ao inicializar o banco:', error.message);
    process.exitCode = 1;
});
