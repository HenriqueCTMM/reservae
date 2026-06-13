import { protectRoute, logout } from './auth.js';
import { getReservations, getTables, getUsers, saveTables } from './data.js';
import { clearMessage, formatDate, showMessage } from './ui.js';

const user = await protectRoute(['admin']);

const adminUserName = document.getElementById('adminUserName');
const logoutButton = document.getElementById('logoutButton');
const tableForm = document.getElementById('tableForm');
const resetFormButton = document.getElementById('resetFormButton');
const adminMessage = document.getElementById('adminMessage');
const restaurantMap = document.getElementById('restaurantMap');
const tablesList = document.getElementById('tablesList');
const tableCount = document.getElementById('tableCount');
const adminReservationsTable = document.getElementById('adminReservationsTable');

adminUserName.textContent = user.nome;
logoutButton.addEventListener('click', logout);

function getFormValues() {
    return {
        id: document.getElementById('tableId').value,
        numero: Number(document.getElementById('numero').value),
        capacidade: Number(document.getElementById('capacidade').value),
        posicaoX: Number(document.getElementById('posicaoX').value),
        posicaoY: Number(document.getElementById('posicaoY').value),
        status: document.getElementById('status').value
    };
}

function resetForm({ focusFirstField = false } = {}) {
    tableForm.reset();
    document.getElementById('tableId').value = '';

    if (focusFirstField) {
        document.getElementById('numero').focus();
    }
}

function renderMap() {
    const tables = getTables();
    restaurantMap.innerHTML = '';
    tableCount.textContent = String(tables.length);

    if (!tables.length) {
        restaurantMap.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400">Nenhuma mesa cadastrada.</div>';
        return;
    }

    tables.forEach((table) => {
        const card = document.createElement('button');
        const statusClasses = table.status === 'disponivel'
            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
            : 'bg-slate-200 text-slate-700 border-slate-300';

        card.type = 'button';
        card.className = `absolute flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 text-sm font-semibold shadow-sm transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${statusClasses}`;
        card.style.left = `${table.posicaoX}px`;
        card.style.top = `${table.posicaoY}px`;
        card.innerHTML = `
      <span>Mesa ${table.numero}</span>
      <span class="text-xs font-medium">${table.capacidade} lugares</span>
    `;

        card.addEventListener('click', () => fillForm(table.id));
        restaurantMap.appendChild(card);
    });
}

function renderTablesList() {
    const tables = getTables().sort((a, b) => a.numero - b.numero);
    tablesList.innerHTML = '';

    if (!tables.length) {
        tablesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Nenhuma mesa cadastrada.</div>';
        return;
    }

    tables.forEach((table) => {
        const item = document.createElement('div');
        item.className = 'rounded-2xl border border-slate-200 p-4';
        item.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold">Mesa ${table.numero}</h3>
          <p class="text-sm text-slate-500">Capacidade: ${table.capacidade} pessoas</p>
          <p class="text-sm text-slate-500">Posição: (${table.posicaoX}, ${table.posicaoY})</p>
          <p class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${table.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}">${table.status}</p>
        </div>
        <div class="flex flex-col gap-2">
          <button data-edit="${table.id}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Editar</button>
          <button data-delete="${table.id}" class="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Excluir</button>
        </div>
      </div>
    `;

        tablesList.appendChild(item);
    });

    document.querySelectorAll('[data-edit]').forEach((button) => {
        button.addEventListener('click', () => fillForm(Number(button.dataset.edit)));
    });

    document.querySelectorAll('[data-delete]').forEach((button) => {
        button.addEventListener('click', () => deleteTable(Number(button.dataset.delete)));
    });
}

function renderReservations() {
    const reservations = getReservations();
    const tables = getTables();
    const users = getUsers();
    adminReservationsTable.innerHTML = '';

    if (!reservations.length) {
        adminReservationsTable.innerHTML = '<tr><td colspan="6" class="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Nenhuma reserva cadastrada.</td></tr>';
        return;
    }

    reservations
        .slice()
        .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`))
        .forEach((reservation) => {
            const table = tables.find((item) => item.id === reservation.mesaId);
            const reservationUser = users.find((item) => item.id === reservation.usuarioId);
            const row = document.createElement('tr');
            row.className = 'bg-slate-50 text-sm';
            row.innerHTML = `
        <td class="rounded-l-2xl px-3 py-3">${reservationUser?.nome || 'Usuário'}</td>
        <td class="px-3 py-3">Mesa ${table?.numero || '-'}</td>
        <td class="px-3 py-3">${formatDate(reservation.data)}</td>
        <td class="px-3 py-3">${reservation.horario}</td>
        <td class="px-3 py-3">${reservation.pessoas}</td>
        <td class="rounded-r-2xl px-3 py-3"><span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">${reservation.status}</span></td>
      `;
            adminReservationsTable.appendChild(row);
        });
}

function fillForm(tableId) {
    const tables = getTables();
    const table = tables.find((item) => item.id === tableId);

    if (!table) {
        return;
    }

    document.getElementById('tableId').value = String(table.id);
    document.getElementById('numero').value = String(table.numero);
    document.getElementById('capacidade').value = String(table.capacidade);
    document.getElementById('posicaoX').value = String(table.posicaoX);
    document.getElementById('posicaoY').value = String(table.posicaoY);
    document.getElementById('status').value = table.status;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('numero').focus({ preventScroll: true });
}

function deleteTable(tableId) {
    const reservations = getReservations();
    const hasReservation = reservations.some((item) => item.mesaId === tableId);

    if (hasReservation) {
        showMessage(adminMessage, 'Esta mesa possui reservas vinculadas e não pode ser excluída agora.', 'error');
        return;
    }

    const tables = getTables().filter((item) => item.id !== tableId);
    saveTables(tables);
    showMessage(adminMessage, 'Mesa removida com sucesso.');
    renderAll();
    resetForm();
}

function renderAll() {
    renderMap();
    renderTablesList();
    renderReservations();
}

tableForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessage(adminMessage);

    const formValues = getFormValues();
    const tables = getTables();
    const tableId = Number(formValues.id);

    const duplicatedNumber = tables.some((item) => item.numero === formValues.numero && item.id !== tableId);

    if (duplicatedNumber) {
        showMessage(adminMessage, 'Já existe uma mesa com esse número.', 'error');
        return;
    }

    if (tableId) {
        const updatedTables = tables.map((item) => {
            if (item.id !== tableId) {
                return item;
            }

            return {
                ...item,
                numero: formValues.numero,
                capacidade: formValues.capacidade,
                posicaoX: formValues.posicaoX,
                posicaoY: formValues.posicaoY,
                status: formValues.status
            };
        });

        saveTables(updatedTables);
        showMessage(adminMessage, 'Mesa atualizada com sucesso.');
    } else {
        const newTable = {
            id: tables.length ? Math.max(...tables.map((item) => item.id)) + 1 : 1,
            numero: formValues.numero,
            capacidade: formValues.capacidade,
            posicaoX: formValues.posicaoX,
            posicaoY: formValues.posicaoY,
            status: formValues.status
        };

        saveTables([...tables, newTable]);
        showMessage(adminMessage, 'Mesa cadastrada com sucesso.');
    }

    resetForm();
    renderAll();
});

resetFormButton.addEventListener('click', () => {
    clearMessage(adminMessage);
    resetForm({ focusFirstField: true });
});

renderAll();
