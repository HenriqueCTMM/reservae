const bcrypt = require('bcryptjs');

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authError(status, message) {
    return Object.assign(new Error(message), { status });
}

module.exports = function createAuthService(User) {
    return {
        async register(body) {
            const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
            const email = normalizeEmail(body?.email);
            const senha = body?.senha;

            if (!nome || nome.length > 120 || !validEmail(email)) {
                throw authError(400, 'Informe um nome de até 120 caracteres e um e-mail válido.');
            }
            // bcrypt considera no máximo 72 bytes; rejeitar senhas que seriam truncadas.
            if (typeof senha !== 'string' || senha.length < 6 || Buffer.byteLength(senha, 'utf8') > 72) {
                throw authError(400, 'A senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.');
            }

            const hashedPassword = await bcrypt.hash(senha, 12);
            try {
                await User.create(nome, email, hashedPassword);
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    throw authError(409, 'Este e-mail já está cadastrado.');
                }
                throw error;
            }
        },

        async authenticate(body) {
            const email = normalizeEmail(body?.email);
            const senha = body?.senha;
            if (!validEmail(email) || typeof senha !== 'string' || !senha || Buffer.byteLength(senha, 'utf8') > 72) {
                throw authError(400, 'Informe um e-mail válido e sua senha.');
            }
            const user = await User.findByEmail(email);
            if (!user || !(await bcrypt.compare(senha, user.password))) {
                throw authError(401, 'E-mail ou senha inválidos.');
            }
            return user;
        }
    };
};
