const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const User = require('../models/user');
const Table = require('../models/table');

const DEFAULT_TABLES = [
    { numero: 1, capacidade: 2, status: 'disponivel', posicaoX: 40, posicaoY: 40 },
    { numero: 2, capacidade: 4, status: 'disponivel', posicaoX: 220, posicaoY: 40 },
    { numero: 3, capacidade: 4, status: 'disponivel', posicaoX: 420, posicaoY: 40 },
    { numero: 4, capacidade: 6, status: 'disponivel', posicaoX: 120, posicaoY: 210 },
    { numero: 5, capacidade: 8, status: 'indisponivel', posicaoX: 360, posicaoY: 220 }
];

async function seedClient() {
    const nome = 'Cliente Demonstração';
    const email = 'cliente@example.com';
    const senha = 'cliente123';

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        if (existingUser.perfil !== 'cliente') {
            throw new Error('O e-mail do cliente de demonstração já pertence a um administrador. Nenhum dado foi alterado.');
        }
        console.log('Cliente de demonstração já cadastrado. Nenhum dado foi alterado.');
        return;
    }

    const hashedPassword = await bcrypt.hash(senha, 12);
    await User.create(nome, email, hashedPassword);
    console.log('Cliente de demonstração criado com sucesso.');
}

async function seedTables() {
    let created = 0;
    for (const table of DEFAULT_TABLES) {
        const existingTable = await Table.findByNumber(table.numero);
        if (!existingTable) {
            await Table.create(table);
            created += 1;
        }
    }
    console.log(`Mesas de demonstração: ${created} criadas. Mesas já cadastradas foram preservadas.`);
}

async function main() {
    try {
        await seedClient();
        await seedTables();
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('Erro ao preparar dados de demonstração:', error.message);
    process.exitCode = 1;
});
