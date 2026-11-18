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
        // Atualiza também os bancos criados antes da carga de horários do M04.
        const [columns] = await pool.query("SHOW COLUMNS FROM operating_settings LIKE 'demo_hours_seeded'");
        if (columns.length === 0) {
            await pool.query('ALTER TABLE operating_settings ADD COLUMN demo_hours_seeded BOOLEAN NOT NULL DEFAULT FALSE');
        }
        const [reservationColumns] = await pool.query("SHOW COLUMNS FROM messages LIKE 'reserva_id'");
        if (reservationColumns.length === 0) {
            await pool.query(`ALTER TABLE messages ADD COLUMN reserva_id INT UNSIGNED NULL AFTER usuario_id,
                ADD CONSTRAINT messages_reservation_fk FOREIGN KEY (reserva_id)
                REFERENCES reservations (id) ON DELETE RESTRICT ON UPDATE RESTRICT`);
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
