import { seedInitialData } from './js/data.js';
import { getCurrentUser, login, redirectByUserRole } from './js/auth.js';
import { showMessage, clearMessage } from './js/ui.js';

seedInitialData();

const currentUser = getCurrentUser();

if (currentUser) {
    redirectByUserRole(currentUser);
}

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessage(loginMessage);

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();

    const user = login(email, senha);

    if (!user) {
        showMessage(loginMessage, 'E-mail ou senha inválidos.', 'error');
        return;
    }

    if (user.perfil === 'admin') {
        window.location.href = './pages/admin.html';
        return;
    }

    window.location.href = './pages/reservas.html';
});