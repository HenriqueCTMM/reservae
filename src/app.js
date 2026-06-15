import {
    signInWithEmailAndPassword,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth, googleProvider } from './js/firebaseConfig.js';
import { STORAGE_KEYS, setStorageData } from './js/services/session-storage-service.js';
import { clearMessage, setFieldInvalid, showMessage } from './js/ui.js';
import {
    ADMIN_EMAIL,
    ensureClientProfile,
    getUserProfile,
    saveAdminProfile
} from './js/services/users-service.js';

const loginForm = document.getElementById('loginForm');
const googleLoginButton = document.getElementById('googleLoginButton');
const loginMessage = document.getElementById('loginMessage');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('senha');

function saveSession(profile) {
    const sessionUser = {
        id: profile.uid,
        nome: profile.nome,
        email: profile.email,
        perfil: profile.perfil,
        authProvider: profile.authProvider || 'password'
    };

    setStorageData(STORAGE_KEYS.currentUser, sessionUser);
    return sessionUser;
}

function redirectByProfile(profile) {
    const user = saveSession(profile);

    if (user.perfil === 'admin') {
        window.location.href = './pages/admin.html';
        return;
    }

    window.location.href = './pages/reservas.html';
}

function getLoginErrorMessage(error) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        return 'E-mail ou senha inválidos.';
    }

    if (error.code === 'auth/user-not-found') {
        return 'Usuário não encontrado.';
    }

    if (error.code === 'auth/popup-closed-by-user') {
        return 'Login com Google cancelado.';
    }

    return 'Não foi possível entrar. Tente novamente.';
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(loginMessage);
    setFieldInvalid(emailField, false);
    setFieldInvalid(passwordField, false);

    const email = emailField.value.trim();
    const senha = passwordField.value.trim();

    try {
        const credential = await signInWithEmailAndPassword(auth, email, senha);
        let profile = await getUserProfile(credential.user.uid);

        if (credential.user.email === ADMIN_EMAIL) {
            profile = await saveAdminProfile(credential.user);
        }

        if (!profile) {
            showMessage(loginMessage, 'Perfil do usuário não encontrado no banco de dados.', 'error');
            return;
        }

        redirectByProfile(profile);
    } catch (error) {
        setFieldInvalid(emailField);
        setFieldInvalid(passwordField);
        showMessage(loginMessage, getLoginErrorMessage(error), 'error');
    }
});

googleLoginButton.addEventListener('click', async () => {
    clearMessage(loginMessage);
    setFieldInvalid(emailField, false);
    setFieldInvalid(passwordField, false);

    try {
        const credential = await signInWithPopup(auth, googleProvider);
        const profile = credential.user.email === ADMIN_EMAIL
            ? await saveAdminProfile(credential.user)
            : await ensureClientProfile(credential.user);

        redirectByProfile({
            ...profile,
            authProvider: 'google'
        });
    } catch (error) {
        showMessage(loginMessage, getLoginErrorMessage(error), 'error');
    }
});
