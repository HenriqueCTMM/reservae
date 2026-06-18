import { request } from './services/api-service.js';
import { STORAGE_KEYS, getStorageData, setStorageData } from './services/session-storage-service.js';

function saveCurrentUser(profile) {
    const storedUser = getCurrentUser();
    const sessionUser = {
        id: profile.uid,
        nome: profile.nome,
        email: profile.email,
        perfil: profile.perfil,
        authProvider: profile.authProvider || (storedUser?.id === profile.uid ? storedUser.authProvider : null) || 'password'
    };

    setStorageData(STORAGE_KEYS.currentUser, sessionUser);
    return sessionUser;
}

function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
}

function stopAfterRedirect(url) {
    window.location.replace(url);
    return new Promise(() => {});
}

function getLoginUrl() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : './index.html';
}

function getRoleUrl(user) {
    const isPagesRoute = window.location.pathname.includes('/pages/');

    if (user.perfil === 'admin') {
        return isPagesRoute ? './admin.html' : './pages/admin.html';
    }

    return isPagesRoute ? './reservas.html' : './pages/reservas.html';
}

export function getCurrentUser() {
    return getStorageData(STORAGE_KEYS.currentUser, null);
}

export async function logout() {
    await request('/auth/logout', { method: 'POST', body: '{}' });
    clearCurrentUser();
    window.location.href = getLoginUrl();
}

export function redirectByUserRole(user) {
    window.location.href = getRoleUrl(user);
}

export async function protectRoute(allowedProfiles = []) {
    let profile;
    try {
        profile = await request('/auth/me');
    } catch (error) {
        if (error.status !== 401) throw error;
        clearCurrentUser();
        return stopAfterRedirect(getLoginUrl());
    }

    const user = saveCurrentUser(profile);

    if (allowedProfiles.length && !allowedProfiles.includes(user.perfil)) {
        return stopAfterRedirect(getRoleUrl(user));
    }

    return user;
}
