import { logout, protectRoute } from './auth.js';
import { createMessage, getMessagesByUser } from './services/messages-service.js';
import { clearMessage, escapeHtml, setFieldInvalid, showMessage } from './ui.js';

const currentUser = await protectRoute(['cliente']);

const clientUserName = document.getElementById('clientUserName');
const logoutButton = document.getElementById('logoutButton');
const contactForm = document.getElementById('contactForm');
const contactSubject = document.getElementById('contactSubject');
const contactMessageText = document.getElementById('contactMessageText');
const contactMessage = document.getElementById('contactMessage');
const clientMessagesList = document.getElementById('clientMessagesList');

let messages = [];

clientUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

function formatDateTime(timestamp) {
    if (!timestamp) {
        return 'data não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(new Date(timestamp));
}

function getMessageStatusClasses(status) {
    return status === 'respondida'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-slate-200 text-slate-700';
}

function renderClientMessages() {
    clientMessagesList.innerHTML = '';

    if (!messages.length) {
        clientMessagesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Nenhuma mensagem enviada ainda.</div>';
        return;
    }

    messages.forEach((message) => {
        const item = document.createElement('article');
        const statusClasses = getMessageStatusClasses(message.status);

        item.className = 'rounded-2xl border border-slate-200 p-4';
        item.innerHTML = `
      <div class="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 class="font-bold">${escapeHtml(message.assunto)}</h4>
          <p class="text-xs text-slate-500">Enviada em ${formatDateTime(message.createdAt)}</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}">${message.status}</span>
      </div>
      <p class="text-sm text-slate-600">${escapeHtml(message.mensagem)}</p>
      ${message.resposta ? `
        <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p class="font-semibold">Resposta do restaurante</p>
          <p class="mt-1">${escapeHtml(message.resposta)}</p>
          <p class="mt-2 text-xs text-emerald-700">${formatDateTime(message.respostaEm)}</p>
        </div>
      ` : ''}
    `;
        clientMessagesList.appendChild(item);
    });
}

async function loadMessages() {
    clientMessagesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Carregando mensagens...</div>';

    try {
        messages = await getMessagesByUser(currentUser.id);
        renderClientMessages();
    } catch (error) {
        clientMessagesList.innerHTML = '<div class="rounded-2xl border border-rose-200 p-4 text-sm text-rose-600">Não foi possível carregar as mensagens.</div>';
    }
}

contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(contactMessage);
    setFieldInvalid(contactSubject, false);
    setFieldInvalid(contactMessageText, false);

    const subject = contactSubject.value.trim();
    const text = contactMessageText.value.trim();

    if (!subject || !text) {
        setFieldInvalid(contactSubject, !subject);
        setFieldInvalid(contactMessageText, !text);
        showMessage(contactMessage, 'Preencha assunto e mensagem.', 'error');
        return;
    }

    try {
        const newMessage = await createMessage({
            usuarioId: currentUser.id,
            usuarioNome: currentUser.nome,
            usuarioEmail: currentUser.email,
            assunto: subject,
            mensagem: text
        });

        messages.unshift(newMessage);
        contactForm.reset();
        renderClientMessages();
        showMessage(contactMessage, 'Mensagem enviada com sucesso.');
    } catch (error) {
        showMessage(contactMessage, 'Não foi possível enviar a mensagem. Tente novamente.', 'error');
    }
});

await loadMessages();
