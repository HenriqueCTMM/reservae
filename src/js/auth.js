import { STORAGE_KEYS, getStorageData, setStorageData } from './storage.js';
import { getUsers } from './data.js';

export function login(email, senha) {
    const users = getUsers();
    const user = users.find((item) => item.email === email && item.senha === senha);

    if (!user) {
        return null;
    }

    const sessionUser = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
    };

    setStorageData(STORAGE_KEYS.currentUser, sessionUser);
    return sessionUser;
}

export function getCurrentUser() {
    return getStorageData(STORAGE_KEYS.currentUser, null);
}

export function logout() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    window.location.href = '../index.html';
}

export function redirectByUserRole(user) {
    if (user.perfil === 'admin') {
        window.location.href = './pages/admin.html';
        return;
    }

    window.location.href = './pages/reservas.html';
}
