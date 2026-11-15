import { request } from './js/services/api-service.js';
import { clearMessage, setFieldInvalid, showMessage } from './js/ui.js';

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('senha');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(loginMessage);
    setFieldInvalid(emailField, false);
    setFieldInvalid(passwordField, false);
    const button = loginForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        const user = await request('/auth/login', {
            method: 'POST', body: JSON.stringify({ email: emailField.value.trim(), senha: passwordField.value })
        });
        window.location.href = user.perfil === 'admin' ? '/pages/admin.html' : '/pages/reservas.html';
    } catch (error) {
        setFieldInvalid(emailField);
        setFieldInvalid(passwordField);
        showMessage(loginMessage, error.message, 'error');
    } finally {
        button.disabled = false;
    }
});
