import { request } from './services/api-service.js';
import { clearMessage, setFieldInvalid, showMessage } from './ui.js';

const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');
const nameField = document.getElementById('nome');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('senha');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(registerMessage);
    [nameField, emailField, passwordField].forEach((field) => setFieldInvalid(field, false));
    const button = registerForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        await request('/auth/register', { method: 'POST', body: JSON.stringify({
            nome: nameField.value.trim(), email: emailField.value.trim(), senha: passwordField.value
        }) });
        registerForm.reset();
        showMessage(registerMessage, 'Cadastro criado com sucesso. Volte ao login para entrar.');
    } catch (error) {
        showMessage(registerMessage, error.message, 'error');
    } finally {
        button.disabled = false;
    }
});
