// O navegador usa id no login e uid ao recuperar o perfil da sessão.
module.exports = function publicProfile(user) {
    return {
        id: String(user.id),
        uid: String(user.id),
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        authProvider: 'password'
    };
};
