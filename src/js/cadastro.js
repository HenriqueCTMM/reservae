import {
    createUserWithEmailAndPassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth } from './firebaseConfig.js';
import { saveUserProfile } from './services/users-service.js';
import { clearMessage, showMessage } from './ui.js';

const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

function getErrorMessage(error) {
    if (error.code === 'auth/email-already-in-use') {
        return 'Este e-mail já está cadastrado.';
    }

    if (error.code === 'auth/weak-password') {
        return 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (error.code === 'auth/invalid-email') {
        return 'Digite um e-mail válido.';
    }

    return 'Não foi possível criar a conta. Tente novamente.';
}

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(registerMessage);

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();

    try {
        const credential = await createUserWithEmailAndPassword(auth, email, senha);

        await updateProfile(credential.user, { displayName: nome });
        await saveUserProfile({
            uid: credential.user.uid,
            nome,
            email,
            perfil: 'cliente'
        });

        registerForm.reset();
        showMessage(registerMessage, 'Cadastro criado com sucesso.');
    } catch (error) {
        showMessage(registerMessage, getErrorMessage(error), 'error');
    }
});
