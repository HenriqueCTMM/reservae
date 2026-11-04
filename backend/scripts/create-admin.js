const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const User = require('../models/user');

async function main() {
    try {
        const nome = (process.env.ADMIN_NAME || 'Administrador').trim();
        const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const senha = process.env.ADMIN_PASSWORD;

        if (!nome || nome.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Configure ADMIN_NAME (até 120 caracteres) e ADMIN_EMAIL válido em backend/.env.');
        }
        if (typeof senha !== 'string' || senha.length < 6 || Buffer.byteLength(senha, 'utf8') > 72) {
            throw new Error('Configure ADMIN_PASSWORD com pelo menos 6 caracteres e no máximo 72 bytes em backend/.env.');
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            if (existingUser.perfil !== 'admin') {
                throw new Error('Este e-mail já pertence a um cliente. Escolha outro e-mail para o administrador.');
            }
            console.log('Administrador já cadastrado. Nenhum dado foi alterado.');
            return;
        }

        const hashedPassword = await bcrypt.hash(senha, 12);
        await User.createAdmin(nome, email, hashedPassword);
        console.log('Administrador criado com sucesso. Entre com o e-mail e a senha configurados.');
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('Erro ao criar administrador:', error.message);
    process.exitCode = 1;
});
