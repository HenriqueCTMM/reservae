import './auth.js';
import { createMessage, getMyMessages } from './services/messages-service.js';
import { clearMessage, escapeHtml, setFieldInvalid, showMessage } from './ui.js';

const contactForm = document.getElementById('contactForm');
const contactSubject = document.getElementById('contactSubject');
const contactMessageText = document.getElementById('contactMessageText');
const contactMessage = document.getElementById('contactMessage');
const clientMessagesList = document.getElementById('clientMessagesList');
const sendMessageButton = document.getElementById('sendMessageButton');
const reloadMyMessagesButton = document.getElementById('reloadMyMessagesButton');

let messages = [];
let contactBusy = false;

function formatDateTime(timestamp) {
    if (!timestamp) {
        return 'data não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo'
    }).format(new Date(Number(timestamp)));
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
        <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}">${message.status === 'respondida' ? 'Respondida' : 'Aberta'}</span>
      </div>
      <p class="text-sm text-slate-600">${escapeHtml(message.mensagem)}</p>
      ${message.resposta ? `
        <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p class="font-semibold">Resposta do restaurante</p>
          <p class="mt-1">${escapeHtml(message.resposta)}</p>
          <p class="mt-2 text-xs text-emerald-700">${formatDateTime(message.respostaEm)} • ${escapeHtml(message.respostaPorNome || 'Restaurante')}</p>
        </div>
      ` : ''}
    `;
        clientMessagesList.appendChild(item);
    });
}

function setContactBusy(busy, saving = false) {
    contactBusy = busy;
    contactSubject.disabled = busy;
    contactMessageText.disabled = busy;
    sendMessageButton.disabled = busy;
    reloadMyMessagesButton.disabled = busy;
    sendMessageButton.textContent = saving ? 'Enviando mensagem...' : 'Enviar mensagem';
    contactForm.setAttribute('aria-busy', String(busy));
}

async function loadMessages() {
    if (contactBusy) return;
    setContactBusy(true);
    clientMessagesList.setAttribute('aria-busy', 'true');
    clientMessagesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Carregando mensagens...</div>';

    try {
        messages = await getMyMessages();
        renderClientMessages();
    } catch (error) {
        messages = [];
        clientMessagesList.innerHTML = `<div role="alert" class="rounded-2xl border border-rose-200 p-4 text-sm text-rose-600">${escapeHtml(error.message || 'Não foi possível carregar as mensagens. Tente recarregar.')}</div>`;
    } finally {
        clientMessagesList.setAttribute('aria-busy', 'false');
        setContactBusy(false);
    }
}

contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (contactBusy) return;
    clearMessage(contactMessage);
    setFieldInvalid(contactSubject, false);
    setFieldInvalid(contactMessageText, false);

    const subject = contactSubject.value.trim();
    const text = contactMessageText.value.trim();

    // maxlength no HTML conta unidades UTF-16; os limites de negócio contam code points.
    if (!subject || [...subject].length > 80 || !text || [...text].length > 500) {
        setFieldInvalid(contactSubject, !subject || [...subject].length > 80);
        setFieldInvalid(contactMessageText, !text || [...text].length > 500);
        showMessage(contactMessage, 'Preencha assunto com até 80 caracteres e mensagem com até 500 caracteres.', 'error');
        return;
    }

    let sent = false;
    setContactBusy(true, true);
    try {
        await createMessage({
            assunto: subject,
            mensagem: text
        });

        sent = true;
        contactForm.reset();
        showMessage(contactMessage, 'Mensagem enviada com sucesso.');
    } catch (error) {
        showMessage(contactMessage, error.message || 'Não foi possível enviar a mensagem. Tente novamente.', 'error');
    } finally {
        setContactBusy(false);
    }
    if (sent) await loadMessages();
});

reloadMyMessagesButton.addEventListener('click', loadMessages);
