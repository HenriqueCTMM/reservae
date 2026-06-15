import {
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth } from './firebaseConfig.js';
import { STORAGE_KEYS, getStorageData, setStorageData } from './services/session-storage-service.js';
import { getUserProfile } from './services/users-service.js';

function waitForAuthUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

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
    await signOut(auth);
    clearCurrentUser();
    window.location.href = getLoginUrl();
}

export function redirectByUserRole(user) {
    window.location.href = getRoleUrl(user);
}

export async function protectRoute(allowedProfiles = []) {
    const firebaseUser = await waitForAuthUser();

    if (!firebaseUser) {
        clearCurrentUser();
        return stopAfterRedirect(getLoginUrl());
    }

    let profile = await getUserProfile(firebaseUser.uid);

    if (!profile) {
        clearCurrentUser();
        await signOut(auth);
        return stopAfterRedirect(getLoginUrl());
    }

    const user = saveCurrentUser(profile);

    if (allowedProfiles.length && !allowedProfiles.includes(user.perfil)) {
        return stopAfterRedirect(getRoleUrl(user));
    }

    return user;
}
