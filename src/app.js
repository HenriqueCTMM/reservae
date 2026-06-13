import {
    signInWithEmailAndPassword,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth, googleProvider } from './js/firebaseConfig.js';
import { STORAGE_KEYS, setStorageData } from './js/storage.js';
import { clearMessage, showMessage } from './js/ui.js';
import { ensureClientProfile, getUserProfile } from './js/services/users-service.js';

const loginForm = document.getElementById('loginForm');
const googleLoginButton = document.getElementById('googleLoginButton');
const loginMessage = document.getElementById('loginMessage');

function saveSession(profile) {
    const sessionUser = {
        id: profile.uid,
        nome: profile.nome,
        email: profile.email,
        perfil: profile.perfil
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

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();

    try {
        const credential = await signInWithEmailAndPassword(auth, email, senha);
        const profile = await getUserProfile(credential.user.uid);

        if (!profile) {
            showMessage(loginMessage, 'Perfil do usuário não encontrado no banco de dados.', 'error');
            return;
        }

        redirectByProfile(profile);
    } catch (error) {
        showMessage(loginMessage, getLoginErrorMessage(error), 'error');
    }
});

googleLoginButton.addEventListener('click', async () => {
    clearMessage(loginMessage);

    try {
        const credential = await signInWithPopup(auth, googleProvider);
        const profile = await ensureClientProfile(credential.user);

        redirectByProfile({
            ...profile,
            perfil: 'cliente'
        });
    } catch (error) {
        showMessage(loginMessage, getLoginErrorMessage(error), 'error');
    }
});
