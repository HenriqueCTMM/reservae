import { logout, protectRoute } from './auth.js';
import { clearMessage, escapeHtml, formatDate, showMessage } from './ui.js';
import { createMessage, getMessagesByUser } from './services/messages-service.js';
import { createReservation, getActiveReservationConflict, getReservations } from './services/reservations-service.js';
import { getTables } from './services/tables-service.js';

const currentUser = await protectRoute(['cliente']);
const clientUserName = document.getElementById('clientUserName');
const logoutButton = document.getElementById('logoutButton');
const reservationForm = document.getElementById('reservationForm');
const reservationMessage = document.getElementById('reservationMessage');
const clientRestaurantMap = document.getElementById('clientRestaurantMap');
const selectedTableBox = document.getElementById('selectedTableBox');
const reservationDate = document.getElementById('reservationDate');
const reservationTime = document.getElementById('reservationTime');
const reservationPeople = document.getElementById('reservationPeople');
const contactForm = document.getElementById('contactForm');
const contactSubject = document.getElementById('contactSubject');
const contactMessageText = document.getElementById('contactMessageText');
const contactMessage = document.getElementById('contactMessage');
const clientMessagesList = document.getElementById('clientMessagesList');

clientUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

let tables = [];
let reservations = [];
let messages = [];
let selectedTableId = null;

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    reservationDate.min = today;
}

function getSelectedTable() {
    return tables.find((item) => item.id === selectedTableId);
}

function isTableReserved(tableId, date, time) {
    return reservations.some((item) => item.mesaId === tableId && item.data === date && item.horario === time && item.status === 'ativa');
}

function getTableVisualStatus(table) {
    const date = reservationDate.value;
    const time = reservationTime.value;
    const people = Number(reservationPeople.value);

    if (table.status === 'indisponivel') {
        return 'indisponivel';
    }

    if (people && people > table.capacidade) {
        return 'indisponivel';
    }

    if (!date || !time) {
        return 'disponivel';
    }

    return isTableReserved(table.id, date, time) ? 'reservada' : 'disponivel';
}

function updateSelectedTableBox() {
    const table = getSelectedTable();

    if (!table) {
        selectedTableId = null;
        selectedTableBox.textContent = 'Nenhuma mesa selecionada';
        selectedTableBox.className = 'rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-500';
        return;
    }

    selectedTableBox.textContent = `Mesa ${table.numero} • ${table.capacidade} lugares`;
    selectedTableBox.className = 'rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700';
}

function renderMap() {
    clientRestaurantMap.innerHTML = '';

    if (!tables.length) {
        clientRestaurantMap.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400">Nenhuma mesa cadastrada.</div>';
        return;
    }

    tables.forEach((table) => {
        const visualStatus = getTableVisualStatus(table);
        const button = document.createElement('button');
        const isSelected = selectedTableId === table.id;

        const statusClassMap = {
            disponivel: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:scale-[1.02]',
            reservada: 'bg-rose-100 text-rose-700 border-rose-300 cursor-not-allowed',
            indisponivel: 'bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed'
        };

        button.type = 'button';
        button.dataset.tableId = String(table.id);
        button.className = `absolute flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-80 ${statusClassMap[visualStatus]} ${isSelected ? 'ring-4 ring-slate-300' : ''}`;
        button.style.left = `${table.posicaoX}px`;
        button.style.top = `${table.posicaoY}px`;
        button.innerHTML = `
      <span>Mesa ${table.numero}</span>
      <span class="text-xs font-medium">${table.capacidade} lugares</span>
    `;

        if (visualStatus === 'disponivel') {
            button.addEventListener('click', () => {
                selectedTableId = table.id;
                updateSelectedTableBox();
                renderMap();
                clientRestaurantMap.querySelector(`[data-table-id="${table.id}"]`)?.focus();
            });
        } else {
            button.disabled = true;
        }

        clientRestaurantMap.appendChild(button);
    });
}

function validateReservationData() {
    const date = reservationDate.value;
    const time = reservationTime.value;
    const people = Number(reservationPeople.value);
    const table = getSelectedTable();

    if (!date || !time || !people) {
        showMessage(reservationMessage, 'Preencha data, horário e quantidade de pessoas.', 'error');
        return false;
    }

    if (!table) {
        showMessage(reservationMessage, 'Selecione uma mesa disponível no mapa.', 'error');
        return false;
    }

    if (people > table.capacidade) {
        showMessage(reservationMessage, 'A quantidade de pessoas excede a capacidade da mesa selecionada.', 'error');
        return false;
    }

    if (table.status === 'indisponivel') {
        showMessage(reservationMessage, 'Esta mesa está indisponível.', 'error');
        return false;
    }

    if (isTableReserved(table.id, date, time)) {
        showMessage(reservationMessage, 'Esta mesa já está reservada para a data e horário selecionados.', 'error');
        return false;
    }

    return true;
}

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
    if (status === 'respondida') {
        return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'lida') {
        return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-200 text-slate-700';
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
    `;
        clientMessagesList.appendChild(item);
    });
}

async function loadData() {
    clientRestaurantMap.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400">Carregando mesas...</div>';
    clientMessagesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Carregando mensagens...</div>';

    try {
        tables = await getTables();
        reservations = await getReservations();
        messages = await getMessagesByUser(currentUser.id);
        updateSelectedTableBox();
        renderMap();
        renderClientMessages();
    } catch (error) {
        showMessage(reservationMessage, 'Não foi possível carregar as mesas.', 'error');
        clientMessagesList.innerHTML = '<div class="rounded-2xl border border-rose-200 p-4 text-sm text-rose-600">Não foi possível carregar as mensagens.</div>';
    }
}

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(reservationMessage);

    if (!validateReservationData()) {
        return;
    }

    const table = getSelectedTable();
    const newReservation = {
        usuarioId: currentUser.id,
        usuarioNome: currentUser.nome,
        usuarioEmail: currentUser.email,
        mesaId: table.id,
        mesaNumero: table.numero,
        mesaCapacidade: table.capacidade,
        data: reservationDate.value,
        horario: reservationTime.value,
        pessoas: Number(reservationPeople.value),
        status: 'ativa'
    };

    try {
        const conflict = await getActiveReservationConflict(newReservation);

        if (conflict) {
            reservations = await getReservations();
            renderMap();
            showMessage(reservationMessage, 'Esta mesa acabou de ser reservada para a data e horário selecionados. Escolha outra mesa.', 'error');
            return;
        }

        const createdReservation = await createReservation(newReservation);
        reservations.push(createdReservation);
        showMessage(reservationMessage, `Reserva confirmada para a Mesa ${table.numero} em ${formatDate(newReservation.data)} às ${newReservation.horario}.`);

        reservationForm.reset();
        selectedTableId = null;
        updateSelectedTableBox();
        setMinDate();
        renderMap();
    } catch (error) {
        showMessage(reservationMessage, 'Não foi possível salvar a reserva. Tente novamente.', 'error');
    }
});

reservationDate.addEventListener('change', () => {
    selectedTableId = null;
    updateSelectedTableBox();
    renderMap();
});

reservationTime.addEventListener('change', () => {
    selectedTableId = null;
    updateSelectedTableBox();
    renderMap();
});

reservationPeople.addEventListener('input', () => {
    clearMessage(reservationMessage);
    const table = getSelectedTable();

    if (table && Number(reservationPeople.value) > table.capacidade) {
        selectedTableId = null;
        updateSelectedTableBox();
    }

    renderMap();
});

contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(contactMessage);

    const subject = contactSubject.value.trim();
    const text = contactMessageText.value.trim();

    if (!subject || !text) {
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

setMinDate();
await loadData();
