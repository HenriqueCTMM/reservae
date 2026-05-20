import { getCurrentUser, logout, protectRoute } from './auth.js';
import { getReservations, getTables, saveReservations } from './data.js';
import { clearMessage, formatDate, showMessage } from './ui.js';

protectRoute(['cliente']);

const currentUser = getCurrentUser();
const clientUserName = document.getElementById('clientUserName');
const logoutButton = document.getElementById('logoutButton');
const reservationForm = document.getElementById('reservationForm');
const reservationMessage = document.getElementById('reservationMessage');
const clientRestaurantMap = document.getElementById('clientRestaurantMap');
const selectedTableBox = document.getElementById('selectedTableBox');
const reservationDate = document.getElementById('reservationDate');
const reservationTime = document.getElementById('reservationTime');
const reservationPeople = document.getElementById('reservationPeople');

clientUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

let selectedTableId = null;

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    reservationDate.min = today;
}

function isTableReserved(tableId, date, time) {
    const reservations = getReservations();
    return reservations.some((item) => item.mesaId === tableId && item.data === date && item.horario === time && item.status === 'ativa');
}

function getTableVisualStatus(table) {
    const date = reservationDate.value;
    const time = reservationTime.value;

    if (table.status === 'indisponivel') {
        return 'indisponivel';
    }

    if (!date || !time) {
        return 'disponivel';
    }

    return isTableReserved(table.id, date, time) ? 'reservada' : 'disponivel';
}

function updateSelectedTableBox() {
    if (!selectedTableId) {
        selectedTableBox.textContent = 'Nenhuma mesa selecionada';
        selectedTableBox.className = 'rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-500';
        return;
    }

    const table = getTables().find((item) => item.id === selectedTableId);

    if (!table) {
        selectedTableId = null;
        updateSelectedTableBox();
        return;
    }

    selectedTableBox.textContent = `Mesa ${table.numero} • ${table.capacidade} lugares`;
    selectedTableBox.className = 'rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700';
}

function renderMap() {
    const tables = getTables();
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
        button.className = `absolute flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 text-sm font-semibold shadow-sm transition ${statusClassMap[visualStatus]} ${isSelected ? 'ring-4 ring-slate-300' : ''}`;
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
            });
        }

        clientRestaurantMap.appendChild(button);
    });
}

function validateReservationData() {
    const date = reservationDate.value;
    const time = reservationTime.value;
    const people = Number(reservationPeople.value);

    if (!date || !time || !people) {
        showMessage(reservationMessage, 'Preencha data, horário e quantidade de pessoas.', 'error');
        return false;
    }

    if (!selectedTableId) {
        showMessage(reservationMessage, 'Selecione uma mesa disponível no mapa.', 'error');
        return false;
    }

    const table = getTables().find((item) => item.id === selectedTableId);

    if (!table) {
        showMessage(reservationMessage, 'Mesa inválida.', 'error');
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

reservationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessage(reservationMessage);

    if (!validateReservationData()) {
        return;
    }

    const reservations = getReservations();
    const newReservation = {
        id: reservations.length ? Math.max(...reservations.map((item) => item.id)) + 1 : 1,
        usuarioId: currentUser.id,
        mesaId: selectedTableId,
        data: reservationDate.value,
        horario: reservationTime.value,
        pessoas: Number(reservationPeople.value),
        status: 'ativa'
    };

    saveReservations([...reservations, newReservation]);

    const table = getTables().find((item) => item.id === selectedTableId);
    showMessage(reservationMessage, `Reserva confirmada para a Mesa ${table.numero} em ${formatDate(newReservation.data)} às ${newReservation.horario}.`);

    reservationForm.reset();
    selectedTableId = null;
    updateSelectedTableBox();
    setMinDate();
    renderMap();
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
});

setMinDate();
updateSelectedTableBox();
renderMap();