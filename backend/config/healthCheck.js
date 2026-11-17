const mysql = require('mysql2/promise');
const { connectionSettings } = require('./settings');

async function checkHealth() {
    // Uma sondagem não deve aguardar a fila de transações do pool da aplicação.
    const connection = await mysql.createConnection({ ...connectionSettings(), connectTimeout: 3000 });
    try {
        await connection.query({ sql: 'SELECT 1', timeout: 3000 });
    } finally {
        // Encerra o socket mesmo em caso de timeout, sem aguardar uma resposta do banco.
        connection.destroy();
    }
}

module.exports = checkHealth;
