import { protectRoute, logout } from './auth.js';
import { getMessages, updateMessageReply } from './services/messages-service.js';
import {
    formatDuration,
    getDefaultOperatingHoursConfig,
    getOperatingHourExceptions,
    getOperatingHoursConfig,
    getReservationPeriod,
    hasReservationOutsideSchedule,
    normalizeOperatingHoursConfig,
    normalizeSchedule,
    removeOperatingHourException,
    saveOperatingHourException,
    saveOperatingHoursConfig,
    validateSchedule,
    WEEK_DAYS
} from './services/operating-hours-service.js';
import { getReservations, getReservationsByTable, updateReservationStatus } from './services/reservations-service.js';
import { getTables, removeTable, saveTable, updateTable } from './services/tables-service.js';
import { clearMessage, escapeHtml, formatDate, setFieldInvalid, showMessage, trapFocus } from './ui.js';

const user = await protectRoute(['admin']);

const adminUserName = document.getElementById('adminUserName');
const logoutButton = document.getElementById('logoutButton');
const tableForm = document.getElementById('tableForm');
const tableFormTitle = document.getElementById('table-form-title');
const resetFormButton = document.getElementById('resetFormButton');
const rotateTableButton = document.getElementById('rotateTableButton');
const rotationValue = document.getElementById('rotationValue');
const adminMessage = document.getElementById('adminMessage');
const restaurantMap = document.getElementById('restaurantMap');
const restaurantMapModal = document.getElementById('restaurantMapModal');
const openAdminMapButton = document.getElementById('openAdminMapButton');
const adminMapModal = document.getElementById('adminMapModal');
const closeAdminMapButton = document.getElementById('closeAdminMapButton');
const tablesList = document.getElementById('tablesList');
const tableCount = document.getElementById('tableCount');
const adminReservationsTable = document.getElementById('adminReservationsTable');
const refreshReservationsButton = document.getElementById('refreshReservationsButton');
const reservationFiltersForm = document.getElementById('reservationFiltersForm');
const clearReservationFiltersButton = document.getElementById('clearReservationFiltersButton');
const reservationDateFilter = document.getElementById('reservationDateFilter');
const reservationStatusFilter = document.getElementById('reservationStatusFilter');
const reservationSearchFilter = document.getElementById('reservationSearchFilter');
const reservationResultsCount = document.getElementById('reservationResultsCount');
const reservationReportForm = document.getElementById('reservationReportForm');
const reportStartDate = document.getElementById('reportStartDate');
const reportEndDate = document.getElementById('reportEndDate');
const reportStatusFilter = document.getElementById('reportStatusFilter');
const reportSearchFilter = document.getElementById('reportSearchFilter');
const clearReportFiltersButton = document.getElementById('clearReportFiltersButton');
const reservationReportTotals = document.getElementById('reservationReportTotals');
const reservationReportTable = document.getElementById('reservationReportTable');
const refreshMessagesButton = document.getElementById('refreshMessagesButton');
const adminMessagesList = document.getElementById('adminMessagesList');
const weeklyHoursForm = document.getElementById('weeklyHoursForm');
const weeklyHoursFields = document.getElementById('weeklyHoursFields');
const exceptionForm = document.getElementById('exceptionForm');
const exceptionDate = document.getElementById('exceptionDate');
const exceptionOpen = document.getElementById('exceptionOpen');
const exceptionShift1Start = document.getElementById('exceptionShift1Start');
const exceptionShift1End = document.getElementById('exceptionShift1End');
const exceptionShift2Start = document.getElementById('exceptionShift2Start');
const exceptionShift2End = document.getElementById('exceptionShift2End');
const exceptionReason = document.getElementById('exceptionReason');
const clearExceptionFormButton = document.getElementById('clearExceptionFormButton');
const exceptionsList = document.getElementById('exceptionsList');

adminUserName.textContent = user.nome;
logoutButton.addEventListener('click', logout);

let tables = [];
let reservations = [];
let messages = [];
let operatingConfig = getDefaultOperatingHoursConfig();
let operatingExceptions = [];
let ignoreMapClickAfterDrag = false;
let tableAutosaveTimer = null;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 520;
const DEFAULT_TABLE_CAPACITY = 4;
const TABLE_AUTOSAVE_DELAY = 600;

function normalizeRotation(rotation) {
    const value = Number(rotation || 0);
    const normalizedValue = ((value % 360) + 360) % 360;

    return normalizedValue === 90 || normalizedValue === 270 ? 90 : 0;
}

function getOrientationLabel(rotation) {
    return normalizeRotation(rotation) === 90 ? 'Vertical' : 'Horizontal';
}

function getTableDimensions(table) {
    const capacity = Number(table.capacidade || 4);
    const rotation = normalizeRotation(table.rotacao);
    const unit = 96;
    const multiplier = capacity > 6 ? 3 : capacity > 4 ? 2 : 1;
    const horizontal = { width: unit * multiplier, height: unit };

    if (rotation === 90) {
        return { width: horizontal.height, height: horizontal.width };
    }

    return horizontal;
}

function applyTableSize(element, table) {
    const dimensions = getTableDimensions(table);

    element.style.width = `${dimensions.width}px`;
    element.style.height = `${dimensions.height}px`;
}

function updateRotationDisplay() {
    rotationValue.textContent = getOrientationLabel(document.getElementById('rotacao').value);
}

function getNextTableNumber() {
    const highestNumber = tables.reduce((highest, table) => Math.max(highest, Number(table.numero) || 0), 0);

    return highestNumber + 1;
}

function getCenteredTablePosition(table) {
    const dimensions = getTableDimensions(table);

    return {
        posicaoX: Math.max(0, Math.round((MAP_WIDTH - dimensions.width) / 2)),
        posicaoY: Math.max(0, Math.round((MAP_HEIGHT - dimensions.height) / 2))
    };
}

function updateTableFormMode() {
    const positionFields = document.getElementById('positionFields');
    const isEditing = Boolean(document.getElementById('tableId').value);

    if (tableFormTitle) {
        tableFormTitle.textContent = isEditing ? 'Editar mesa' : 'Criar nova mesa';
    }

    if (!positionFields) {
        return;
    }

    positionFields.hidden = !isEditing;
}

function applyDefaultTablePosition() {
    const capacity = Number(document.getElementById('capacidade').value) || DEFAULT_TABLE_CAPACITY;
    const rotation = normalizeRotation(document.getElementById('rotacao').value);
    const position = getCenteredTablePosition({ capacidade: capacity, rotacao: rotation });

    document.getElementById('posicaoX').value = String(position.posicaoX);
    document.getElementById('posicaoY').value = String(position.posicaoY);
}

function clearTableFieldInvalidStates() {
    ['numero', 'capacidade', 'posicaoX', 'posicaoY', 'status'].forEach((fieldId) => setFieldInvalid(document.getElementById(fieldId), false));
}

function getFormValues() {
    return {
        id: document.getElementById('tableId').value,
        numero: Number(document.getElementById('numero').value),
        capacidade: Number(document.getElementById('capacidade').value),
        posicaoX: Number(document.getElementById('posicaoX').value),
        posicaoY: Number(document.getElementById('posicaoY').value),
        status: document.getElementById('status').value,
        rotacao: normalizeRotation(document.getElementById('rotacao').value)
    };
}

function resetForm({ focusFirstField = false, blurActiveField = false } = {}) {
    clearTimeout(tableAutosaveTimer);

    if (blurActiveField && tableForm.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    tableForm.reset();
    document.getElementById('tableId').value = '';
    document.getElementById('numero').value = String(getNextTableNumber());
    document.getElementById('capacidade').value = String(DEFAULT_TABLE_CAPACITY);
    document.getElementById('status').value = 'disponivel';
    document.getElementById('rotacao').value = '0';
    applyDefaultTablePosition();
    updateRotationDisplay();
    updateTableFormMode();
    clearTableFieldInvalidStates();

    if (focusFirstField) {
        document.getElementById('numero').focus();
    }
}

function validateTableFormValues(formValues) {
    if (!Number.isFinite(formValues.numero) || formValues.numero < 1) {
        return { valid: false, message: 'Informe um número de mesa válido.', fieldId: 'numero' };
    }

    if (!Number.isFinite(formValues.capacidade) || formValues.capacidade < 1 || formValues.capacidade > 8) {
        return { valid: false, message: 'A capacidade da mesa deve estar entre 1 e 8 lugares.', fieldId: 'capacidade' };
    }

    if (![0, 90].includes(formValues.rotacao)) {
        return { valid: false, message: 'A orientação da mesa deve ser horizontal ou vertical.' };
    }

    if (!Number.isFinite(formValues.posicaoX) || !Number.isFinite(formValues.posicaoY)) {
        return { valid: false, message: 'Informe uma posição válida para a mesa.', fieldId: !Number.isFinite(formValues.posicaoX) ? 'posicaoX' : 'posicaoY' };
    }

    const dimensions = getTableDimensions(formValues);
    const isPositionInvalid = formValues.posicaoX < 0
        || formValues.posicaoY < 0
        || formValues.posicaoX + dimensions.width > MAP_WIDTH
        || formValues.posicaoY + dimensions.height > MAP_HEIGHT;

    if (isPositionInvalid) {
        return { valid: false, message: 'A posição da mesa está fora dos limites do mapa.', fieldId: 'posicaoX' };
    }

    const duplicatedNumber = tables.some((item) => item.numero === formValues.numero && item.id !== formValues.id);

    if (duplicatedNumber) {
        return { valid: false, message: 'Já existe uma mesa com esse número.', fieldId: 'numero' };
    }

    return { valid: true, message: '' };
}

function selectTableForEditing(tableId, { closeMap = false } = {}) {
    const currentTableId = document.getElementById('tableId').value;

    if (currentTableId === tableId) {
        if (closeMap) {
            closeAdminMap();
        }

        return;
    }

    fillForm(tableId);
    renderMap();

    if (closeMap) {
        closeAdminMap();
    }
}

function updateTablePositionPreview(tableId, x, y) {
    tables = tables.map((table) => table.id === tableId ? { ...table, posicaoX: x, posicaoY: y } : table);
}

function applyEditingMapStyle(card) {
    card.classList.remove(
        'bg-emerald-100',
        'text-emerald-700',
        'border-emerald-300',
        'bg-slate-200',
        'text-slate-700',
        'border-slate-300'
    );
    card.classList.add('bg-blue-100', 'text-blue-950', 'border-blue-700', 'ring-4', 'ring-blue-300');
}

async function saveExistingTable(tableId, changes, successMessage = 'Mesa salva automaticamente.') {
    const currentTable = tables.find((table) => table.id === tableId);

    if (!currentTable) {
        return false;
    }

    clearTableFieldInvalidStates();

    const nextTable = {
        ...currentTable,
        ...changes,
        id: tableId,
        rotacao: normalizeRotation(changes.rotacao ?? currentTable.rotacao)
    };
    const validation = validateTableFormValues(nextTable);

    if (!validation.valid) {
        setFieldInvalid(document.getElementById(validation.fieldId));
        showMessage(adminMessage, validation.message, 'error');
        return false;
    }

    try {
        const updatedTable = await updateTable(tableId, nextTable);
        tables = tables.map((table) => table.id === tableId ? updatedTable : table);
        resetForm({ blurActiveField: true });
        renderMap();
        renderTablesList();

        if (successMessage) {
            showMessage(adminMessage, successMessage);
        }

        return true;
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível salvar a mesa automaticamente.', 'error');
        await loadData();
        return false;
    }
}

async function saveCurrentExistingTable(successMessage = 'Mesa salva automaticamente.') {
    const formValues = getFormValues();

    if (!formValues.id) {
        return false;
    }

    return saveExistingTable(formValues.id, formValues, successMessage);
}

function scheduleCurrentTableAutosave() {
    const tableId = document.getElementById('tableId').value;

    clearTimeout(tableAutosaveTimer);

    if (!tableId) {
        return;
    }

    tableAutosaveTimer = setTimeout(() => {
        saveCurrentExistingTable('');
    }, TABLE_AUTOSAVE_DELAY);
}

function startTableDrag(event, table, card, container) {
    if (event.target.closest('[data-toggle-table-orientation]')) {
        return;
    }

    if (event.button !== undefined && event.button !== 0) {
        return;
    }

    const mapRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const offsetX = event.clientX - cardRect.left;
    const offsetY = event.clientY - cardRect.top;
    const dimensions = getTableDimensions(table);
    const maxMapWidth = MAP_WIDTH;
    const maxMapHeight = MAP_HEIGHT;
    let moved = false;
    let nextX = Number(table.posicaoX || 0);
    let nextY = Number(table.posicaoY || 0);

    card.setPointerCapture?.(event.pointerId);
    card.classList.add('scale-[1.03]', 'cursor-grabbing', 'ring-4', 'ring-slate-300');

    function moveTable(pointerEvent) {
        const deltaX = Math.abs(pointerEvent.clientX - event.clientX);
        const deltaY = Math.abs(pointerEvent.clientY - event.clientY);

        if (deltaX > 4 || deltaY > 4) {
            moved = true;
            if (document.getElementById('tableId').value !== table.id) {
                fillForm(table.id, { focusForm: false });
            }
            applyEditingMapStyle(card);
        }

        nextX = Math.max(0, Math.min(pointerEvent.clientX - mapRect.left - offsetX, maxMapWidth - dimensions.width));
        nextY = Math.max(0, Math.min(pointerEvent.clientY - mapRect.top - offsetY, maxMapHeight - dimensions.height));
        card.style.left = `${Math.round(nextX)}px`;
        card.style.top = `${Math.round(nextY)}px`;
    }

    function stopDrag() {
        window.removeEventListener('pointermove', moveTable);
        window.removeEventListener('pointerup', stopDrag);
        card.classList.remove('scale-[1.03]', 'cursor-grabbing', 'ring-4', 'ring-slate-300');

        if (moved) {
            ignoreMapClickAfterDrag = true;
            const roundedX = Math.round(nextX);
            const roundedY = Math.round(nextY);

            updateTablePositionPreview(table.id, roundedX, roundedY);
            if (document.getElementById('tableId').value === table.id) {
                document.getElementById('posicaoX').value = String(roundedX);
                document.getElementById('posicaoY').value = String(roundedY);
            }

            saveExistingTable(table.id, { posicaoX: roundedX, posicaoY: roundedY }, 'Posição da mesa salva automaticamente.');
            setTimeout(() => {
                ignoreMapClickAfterDrag = false;
            }, 0);
        }
    }

    window.addEventListener('pointermove', moveTable);
    window.addEventListener('pointerup', stopDrag, { once: true });
}

function getMapMessageHtml(message, tone = 'muted') {
    const toneClasses = tone === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-slate-50 text-slate-700';

    return `
      <div class="app-map-message flex h-full min-h-64 items-center justify-center p-4 text-center">
        <div class="max-w-sm rounded-2xl border px-5 py-4 text-base font-semibold shadow-sm ${toneClasses}">${message}</div>
      </div>
    `;
}

function closeAdminMap() {
    if (!adminMapModal) {
        return;
    }

    adminMapModal.classList.add('hidden');
    document.body.style.overflow = '';
    openAdminMapButton?.focus({ preventScroll: true });
}

function openAdminMap() {
    if (!adminMapModal) {
        return;
    }

    renderMap();
    adminMapModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    closeAdminMapButton?.focus({ preventScroll: true });
}

function renderMapContainer(container, { closeOnSelect = false } = {}) {
    container.innerHTML = '';
    tableCount.textContent = String(tables.length);

    if (!tables.length) {
        container.innerHTML = getMapMessageHtml('Nenhuma mesa cadastrada.');
        return;
    }

    tables.forEach((table) => {
        const card = document.createElement('div');
        const isEditing = document.getElementById('tableId').value === table.id;
        const statusClasses = isEditing
            ? 'bg-blue-100 text-blue-950 border-blue-700 ring-4 ring-blue-300'
            : table.status === 'disponivel'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-slate-200 text-slate-700 border-slate-300';

        card.role = 'button';
        card.tabIndex = 0;
        card.className = `app-map-table absolute flex cursor-grab select-none flex-col items-center justify-center rounded-2xl border-2 p-2 text-sm font-semibold shadow-sm transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${statusClasses}`;
        card.style.left = `${table.posicaoX}px`;
        card.style.top = `${table.posicaoY}px`;
        card.style.touchAction = 'none';
        applyTableSize(card, table);
        card.innerHTML = `
      <span>Mesa ${table.numero}</span>
      <span class="text-xs font-medium">${table.capacidade} lugares</span>
      <button type="button" data-toggle-table-orientation="${table.id}" title="Girar mesa" aria-label="Girar mesa ${table.numero}"
        class="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 11a8 8 0 0 0-14.9-4" />
          <path d="M5 3v4h4" />
          <path d="M4 13a8 8 0 0 0 14.9 4" />
          <path d="M19 21v-4h-4" />
        </svg>
      </button>
    `;

        card.addEventListener('pointerdown', (event) => startTableDrag(event, table, card, container));

        card.addEventListener('click', async (event) => {
            if (event.target.closest('[data-toggle-table-orientation]')) {
                return;
            }

            if (ignoreMapClickAfterDrag) {
                return;
            }

            selectTableForEditing(table.id, { closeMap: closeOnSelect });
        });

        card.addEventListener('keydown', async (event) => {
            if (event.target.closest('[data-toggle-table-orientation]')) {
                return;
            }

            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            event.preventDefault();
            selectTableForEditing(table.id, { closeMap: closeOnSelect });
        });

        card.querySelector('[data-toggle-table-orientation]').addEventListener('click', async (event) => {
            event.stopPropagation();

            const nextRotation = normalizeRotation(table.rotacao) === 90 ? 0 : 90;
            const saved = await saveExistingTable(table.id, { rotacao: nextRotation }, 'Orientação da mesa salva automaticamente.');

            if (saved && document.getElementById('tableId').value === table.id) {
                document.getElementById('rotacao').value = String(nextRotation);
                updateRotationDisplay();
            }
        });

        container.appendChild(card);
    });
}

function renderMap() {
    if (!restaurantMap || !restaurantMapModal) {
        return;
    }

    renderMapContainer(restaurantMap);
    renderMapContainer(restaurantMapModal, { closeOnSelect: true });
}

function renderTablesList() {
    if (!tablesList) {
        return;
    }

    tablesList.innerHTML = '';

    if (!tables.length) {
        tablesList.innerHTML = '<div class="col-span-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 sm:col-span-3">Nenhuma mesa cadastrada.</div>';
        return;
    }

    tables.forEach((table) => {
        const item = document.createElement('div');
        item.className = 'rounded-2xl border border-slate-200 p-3 sm:p-4';
        item.innerHTML = `
      <div class="flex h-full flex-col justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-bold">Mesa ${table.numero}</h3>
          <p class="text-sm text-slate-500">Capacidade: ${table.capacidade} pessoas</p>
          <p class="text-sm text-slate-500">Posição: (${table.posicaoX}, ${table.posicaoY})</p>
          <p class="text-sm text-slate-500">Orientação: ${getOrientationLabel(table.rotacao)}</p>
          <p class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${table.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}">${table.status}</p>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button data-edit="${table.id}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Editar</button>
          <button data-delete="${table.id}" class="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Excluir</button>
        </div>
      </div>
    `;

        tablesList.appendChild(item);
    });

    document.querySelectorAll('[data-edit]').forEach((button) => {
        button.addEventListener('click', () => selectTableForEditing(button.dataset.edit));
    });

    document.querySelectorAll('[data-delete]').forEach((button) => {
        button.addEventListener('click', () => deleteTable(button.dataset.delete));
    });
}

function getReservationTableNumber(reservation) {
    const table = tables.find((item) => item.id === reservation.mesaId);

    return table?.numero || reservation.mesaNumero || '-';
}

function getFilteredReservations() {
    const date = reservationDateFilter.value;
    const status = reservationStatusFilter.value;
    const search = reservationSearchFilter.value.trim().toLowerCase();

    return reservations.filter((reservation) => {
        const tableNumber = getReservationTableNumber(reservation);
        const clientName = (reservation.usuarioNome || '').toLowerCase();
        const tableText = `mesa ${tableNumber} ${tableNumber}`.toLowerCase();

        const matchesDate = !date || reservation.data === date;
        const matchesStatus = !status || reservation.status === status;
        const matchesSearch = !search || clientName.includes(search) || tableText.includes(search);

        return matchesDate && matchesStatus && matchesSearch;
    });
}

function updateReservationResultsCount(total) {
    reservationResultsCount.textContent = `${total} ${total === 1 ? 'reserva encontrada' : 'reservas encontradas'}`;
}

function getReservationStatusLabel(status) {
    const labels = {
        ativa: 'Ativa',
        finalizada: 'Finalizada',
        cancelada: 'Cancelada',
        nao_compareceu: 'Não compareceu',
        expirada: 'Expirada'
    };

    return labels[status] || status;
}

function getReservationStatusClasses(status) {
    if (status === 'finalizada') {
        return 'bg-sky-100 text-sky-700';
    }

    if (status === 'cancelada') {
        return 'bg-rose-100 text-rose-700';
    }

    if (status === 'nao_compareceu') {
        return 'bg-amber-100 text-amber-700';
    }

    if (status === 'expirada') {
        return 'bg-slate-200 text-slate-700';
    }

    return 'bg-emerald-100 text-emerald-700';
}

function getReservationPeriodText(reservation) {
    const period = getReservationPeriod(reservation);

    if (!period.endTime) {
        return reservation.horario;
    }

    return `${reservation.horario} às ${period.endTime}`;
}

function renderReservations() {
    if (!adminReservationsTable) {
        return;
    }

    const filteredReservations = getFilteredReservations();

    adminReservationsTable.innerHTML = '';
    updateReservationResultsCount(filteredReservations.length);

    if (!filteredReservations.length) {
        const emptyMessage = reservations.length ? 'Nenhuma reserva encontrada para os filtros.' : 'Nenhuma reserva cadastrada.';
        adminReservationsTable.innerHTML = `<tr><td colspan="7" class="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">${emptyMessage}</td></tr>`;
        return;
    }

    filteredReservations.forEach((reservation) => {
        const tableNumber = getReservationTableNumber(reservation);
        const statusClasses = getReservationStatusClasses(reservation.status);
        const isActive = reservation.status === 'ativa';
        const period = getReservationPeriod(reservation);
        const row = document.createElement('tr');
        row.className = 'bg-slate-50 text-sm';
        row.innerHTML = `
        <td class="rounded-l-2xl px-3 py-3">${escapeHtml(reservation.usuarioNome || 'Usuário')}</td>
        <td class="px-3 py-3">Mesa ${tableNumber}</td>
        <td class="px-3 py-3">${formatDate(reservation.data)}</td>
        <td class="px-3 py-3">
          <p>${getReservationPeriodText(reservation)}</p>
          <p class="text-xs text-slate-500">${formatDuration(period.durationMinutes)}</p>
        </td>
        <td class="px-3 py-3">${reservation.pessoas}</td>
        <td class="px-3 py-3"><span class="rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}">${getReservationStatusLabel(reservation.status)}</span></td>
        <td class="rounded-r-2xl px-3 py-3">
          ${isActive ? `
            <div class="grid min-w-56 gap-2 sm:min-w-64">
              <select data-reservation-status="${reservation.id}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
                <option value="finalizada">Finalizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="nao_compareceu">Não compareceu</option>
              </select>
              <input data-reservation-reason="${reservation.id}" type="text" maxlength="160" placeholder="Motivo/observação opcional"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" />
              <button type="button" data-update-reservation-status="${reservation.id}" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Salvar status</button>
            </div>
          ` : `
            <div class="min-w-44 text-xs text-slate-500 sm:min-w-52">
              <p>${reservation.statusUpdatedAt ? formatDateTime(reservation.statusUpdatedAt) : 'Sem data registrada'}</p>
              <p>${escapeHtml(reservation.statusUpdatedByName || 'Admin não informado')}</p>
              ${reservation.statusReason ? `<p class="mt-1">${escapeHtml(reservation.statusReason)}</p>` : ''}
            </div>
          `}
        </td>
      `;
        adminReservationsTable.appendChild(row);
    });
}

function getSearchableReservationText(reservation) {
    const tableNumber = getReservationTableNumber(reservation);

    return `${reservation.usuarioNome || ''} ${reservation.usuarioEmail || ''} mesa ${tableNumber} ${tableNumber}`.toLowerCase();
}

function getReportReservations() {
    const startDate = reportStartDate.value;
    const endDate = reportEndDate.value;
    const status = reportStatusFilter.value;
    const search = reportSearchFilter.value.trim().toLowerCase();

    return reservations.filter((reservation) => {
        const matchesStart = !startDate || reservation.data >= startDate;
        const matchesEnd = !endDate || reservation.data <= endDate;
        const matchesStatus = !status || reservation.status === status;
        const matchesSearch = !search || getSearchableReservationText(reservation).includes(search);

        return matchesStart && matchesEnd && matchesStatus && matchesSearch;
    });
}

function renderReportTotals(reportReservations) {
    const totals = {
        total: reportReservations.length,
        ativa: reportReservations.filter((reservation) => reservation.status === 'ativa').length,
        finalizada: reportReservations.filter((reservation) => reservation.status === 'finalizada').length,
        cancelada: reportReservations.filter((reservation) => reservation.status === 'cancelada').length,
        nao_compareceu: reportReservations.filter((reservation) => reservation.status === 'nao_compareceu').length
    };
    const cards = [
        ['Ativas', totals.ativa],
        ['Finalizadas', totals.finalizada],
        ['Canceladas', totals.cancelada],
        ['Não compareceu', totals.nao_compareceu],
        ['Total', totals.total],
    ];

    reservationReportTotals.innerHTML = cards.map(([label, value]) => `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${label}</p>
        <p class="mt-2 text-2xl font-bold">${value}</p>
      </div>
    `).join('');
}

function renderReservationReport() {
    if (!reservationReportTable || !reservationReportTotals) {
        return;
    }

    const reportReservations = getReportReservations();

    reservationReportTable.innerHTML = '';
    renderReportTotals(reportReservations);

    if (!reportReservations.length) {
        reservationReportTable.innerHTML = '<tr><td colspan="6" class="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Nenhuma reserva encontrada para o relatório.</td></tr>';
        return;
    }

    reportReservations.forEach((reservation) => {
        const tableNumber = getReservationTableNumber(reservation);
        const statusClasses = getReservationStatusClasses(reservation.status);
        const period = getReservationPeriod(reservation);
        const row = document.createElement('tr');

        row.className = 'bg-slate-50 text-sm';
        row.innerHTML = `
          <td class="rounded-l-2xl px-3 py-3">${escapeHtml(reservation.usuarioNome || 'Usuário')}</td>
          <td class="px-3 py-3">Mesa ${tableNumber}</td>
          <td class="px-3 py-3">
            <p>${formatDate(reservation.data)} das ${getReservationPeriodText(reservation)}</p>
            <p class="text-xs text-slate-500">${formatDuration(period.durationMinutes)}</p>
          </td>
          <td class="px-3 py-3"><span class="rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}">${getReservationStatusLabel(reservation.status)}</span></td>
          <td class="px-3 py-3">${reservation.statusUpdatedAt ? formatDateTime(reservation.statusUpdatedAt) : '-'}</td>
          <td class="rounded-r-2xl px-3 py-3">${escapeHtml(reservation.statusReason || '-')}</td>
        `;
        reservationReportTable.appendChild(row);
    });
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

function renderMessages() {
    if (!adminMessagesList) {
        return;
    }

    adminMessagesList.innerHTML = '';

    if (!messages.length) {
        adminMessagesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 md:col-span-2">Nenhuma mensagem enviada pelos clientes.</div>';
        return;
    }

    messages.forEach((message) => {
        const item = document.createElement('article');

        item.className = 'rounded-2xl border border-slate-200 p-4';
        item.innerHTML = `
      <div class="flex h-full flex-col gap-4">
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <h3 class="font-bold">${escapeHtml(message.assunto)}</h3>
          </div>
          <p class="text-sm text-slate-600">${escapeHtml(message.mensagem)}</p>
          <p class="mt-3 text-xs text-slate-500">${escapeHtml(message.usuarioNome || 'Usuário')} • ${escapeHtml(message.usuarioEmail || 'Sem e-mail')} • ${formatDateTime(message.createdAt)}</p>
          ${message.resposta ? `
            <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p class="font-semibold">Resposta enviada</p>
              <p class="mt-1">${escapeHtml(message.resposta)}</p>
              <p class="mt-2 text-xs text-emerald-700">${escapeHtml(message.respostaPorNome || 'Admin')} • ${formatDateTime(message.respostaEm)}</p>
            </div>
          ` : ''}
        </div>
        ${message.resposta ? '' : `
          <div class="grid w-full gap-3">
            <label for="messageReply-${message.id}" class="block text-sm font-medium">Resposta</label>
            <textarea id="messageReply-${message.id}" data-message-reply="${message.id}" rows="4" maxlength="500"
              class="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              placeholder="Digite a resposta ao cliente"></textarea>
            <button type="button" data-save-message-reply="${message.id}"
              class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Salvar resposta</button>
          </div>
        `}
      </div>
    `;
        adminMessagesList.appendChild(item);
    });
}

function getActiveReservations() {
    return reservations.filter((reservation) => reservation.status === 'ativa');
}

function getShiftValue(day, shiftIndex, field) {
    return document.getElementById(`weekly-${day}-${shiftIndex}-${field}`).value;
}

function renderWeeklyHoursForm() {
    weeklyHoursFields.innerHTML = '';

    WEEK_DAYS.forEach((day) => {
        const schedule = operatingConfig.weekly[day.value] || { open: false, shifts: [] };
        const firstShift = schedule.shifts[0] || { start: '', end: '' };
        const secondShift = schedule.shifts[1] || { start: '', end: '' };
        const fieldset = document.createElement('fieldset');

        fieldset.className = 'rounded-2xl border border-slate-200 p-4';
        fieldset.innerHTML = `
      <legend class="font-bold">${day.label}</legend>
      <label class="mt-3 flex items-center gap-2 text-sm font-medium">
        <input id="weekly-${day.value}-open" type="checkbox" class="h-4 w-4 rounded border-slate-300" ${schedule.open ? 'checked' : ''} />
        Aberto neste dia
      </label>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label for="weekly-${day.value}-0-start" class="mb-1 block text-sm font-medium">Turno 1 início</label>
          <input id="weekly-${day.value}-0-start" type="time" step="1800" value="${firstShift.start}"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" />
        </div>
        <div>
          <label for="weekly-${day.value}-0-end" class="mb-1 block text-sm font-medium">Turno 1 fim</label>
          <input id="weekly-${day.value}-0-end" type="time" step="1800" value="${firstShift.end}"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" />
        </div>
        <div>
          <label for="weekly-${day.value}-1-start" class="mb-1 block text-sm font-medium">Turno 2 início</label>
          <input id="weekly-${day.value}-1-start" type="time" step="1800" value="${secondShift.start}"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" />
        </div>
        <div>
          <label for="weekly-${day.value}-1-end" class="mb-1 block text-sm font-medium">Turno 2 fim</label>
          <input id="weekly-${day.value}-1-end" type="time" step="1800" value="${secondShift.end}"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" />
        </div>
      </div>
    `;
        weeklyHoursFields.appendChild(fieldset);
    });
}

function getScheduleText(schedule) {
    if (!schedule.open) {
        return 'Fechado';
    }

    return schedule.shifts.map((shift) => `${shift.start} às ${shift.end}`).join(' e ');
}

function renderExceptions() {
    exceptionsList.innerHTML = '';

    if (!operatingExceptions.length) {
        exceptionsList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Nenhuma exceção cadastrada.</div>';
        return;
    }

    operatingExceptions.forEach((exception) => {
        const item = document.createElement('article');
        const schedule = normalizeSchedule(exception);

        item.className = 'rounded-2xl border border-slate-200 p-4';
        item.innerHTML = `
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 class="font-bold">${formatDate(exception.date)}</h4>
          <p class="text-sm text-slate-600">${getScheduleText(schedule)}</p>
          <p class="mt-1 text-xs text-slate-500">${escapeHtml(exception.reason || 'Sem motivo informado')}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-edit-exception="${exception.date}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Editar</button>
          <button type="button" data-delete-exception="${exception.date}" class="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Excluir</button>
        </div>
      </div>
    `;
        exceptionsList.appendChild(item);
    });
}

function renderOperatingHours() {
    if (!weeklyHoursFields || !exceptionsList) {
        return;
    }

    renderWeeklyHoursForm();
    renderExceptions();
}

function collectWeeklyHoursConfig() {
    const weekly = {};

    WEEK_DAYS.forEach((day) => {
        weekly[day.value] = normalizeSchedule({
            open: document.getElementById(`weekly-${day.value}-open`).checked,
            shifts: [
                { start: getShiftValue(day.value, 0, 'start'), end: getShiftValue(day.value, 0, 'end') },
                { start: getShiftValue(day.value, 1, 'start'), end: getShiftValue(day.value, 1, 'end') }
            ]
        });
    });

    return normalizeOperatingHoursConfig({
        ...operatingConfig,
        weekly
    });
}

function validateOperatingConfig(config) {
    for (const day of WEEK_DAYS) {
        const result = validateSchedule(config.weekly[day.value]);

        if (!result.valid) {
            return { valid: false, message: `${day.label}: ${result.message}` };
        }
    }

    return { valid: true, message: '' };
}

function collectException() {
    return {
        date: exceptionDate.value,
        open: exceptionOpen.value === 'true',
        reason: exceptionReason.value.trim(),
        shifts: [
            { start: exceptionShift1Start.value, end: exceptionShift1End.value },
            { start: exceptionShift2Start.value, end: exceptionShift2End.value }
        ]
    };
}

function resetExceptionForm() {
    exceptionForm.reset();
    exceptionOpen.value = 'true';
}

function fillExceptionForm(date) {
    const exception = operatingExceptions.find((item) => item.date === date);

    if (!exception) {
        return;
    }

    const firstShift = exception.shifts?.[0] || { start: '', end: '' };
    const secondShift = exception.shifts?.[1] || { start: '', end: '' };

    exceptionDate.value = exception.date;
    exceptionOpen.value = String(Boolean(exception.open));
    exceptionShift1Start.value = firstShift.start;
    exceptionShift1End.value = firstShift.end;
    exceptionShift2Start.value = secondShift.start;
    exceptionShift2End.value = secondShift.end;
    exceptionReason.value = exception.reason || '';
    exceptionDate.focus();
}

function findReservationAffectedBySchedule(config, exceptions) {
    return hasReservationOutsideSchedule(getActiveReservations(), config, exceptions);
}

async function refreshReservationsForOperatingHours() {
    reservations = await getReservations();
    renderReservations();
}

function showAffectedReservationMessage(prefix, reservation) {
    showMessage(adminMessage, `${prefix} Existe reserva ativa em ${formatDate(reservation.data)} às ${reservation.horario} para a Mesa ${reservation.mesaNumero || '-'}.`, 'error');
}

function fillForm(tableId, { focusForm = true } = {}) {
    const table = tables.find((item) => item.id === tableId);

    if (!table) {
        return;
    }

    clearTimeout(tableAutosaveTimer);
    clearTableFieldInvalidStates();
    document.getElementById('tableId').value = String(table.id);
    document.getElementById('numero').value = String(table.numero);
    document.getElementById('capacidade').value = String(table.capacidade);
    document.getElementById('posicaoX').value = String(table.posicaoX);
    document.getElementById('posicaoY').value = String(table.posicaoY);
    document.getElementById('rotacao').value = String(normalizeRotation(table.rotacao));
    document.getElementById('status').value = table.status;
    updateRotationDisplay();
    updateTableFormMode();
    if (focusForm) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('numero').focus({ preventScroll: true });
    }
}

function renderAll() {
    renderMap();
    renderTablesList();
    renderReservations();
    renderReservationReport();
    renderMessages();
    renderOperatingHours();
}

async function loadData() {
    if (restaurantMap) {
        restaurantMap.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400">Carregando mesas...</div>';
    }

    if (tablesList) {
        tablesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Carregando mesas...</div>';
    }

    try {
        tables = await getTables();
        reservations = await getReservations();
        messages = await getMessages();
        operatingConfig = await getOperatingHoursConfig();
        operatingExceptions = await getOperatingHourExceptions();
        renderAll();

        if (tableForm && !document.getElementById('tableId').value) {
            resetForm();
        }
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível carregar os dados do restaurante.', 'error');
    }
}

async function refreshMessages() {
    adminMessagesList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">Carregando mensagens...</div>';

    try {
        messages = await getMessages();
        renderMessages();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível atualizar as mensagens.', 'error');
    }
}

async function saveMessageReply(messageId) {
    clearMessage(adminMessage);

    const message = messages.find((item) => item.id === messageId);

    if (message?.resposta) {
        showMessage(adminMessage, 'Esta mensagem já possui resposta e não pode ser editada.', 'error');
        return;
    }

    const replyField = adminMessagesList.querySelector(`[data-message-reply="${messageId}"]`);
    const reply = replyField?.value.trim() || '';

    if (!reply) {
        showMessage(adminMessage, 'Digite uma resposta antes de salvar.', 'error');
        return;
    }

    try {
        const updatedMessage = await updateMessageReply(messageId, { reply, admin: user });
        messages = messages.map((message) => message.id === messageId ? updatedMessage : message);
        renderMessages();
        showMessage(adminMessage, 'Resposta enviada ao cliente.');
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível salvar a resposta.', 'error');
        await refreshMessages();
    }
}

async function refreshReservations() {
    adminReservationsTable.innerHTML = '<tr><td colspan="7" class="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Carregando reservas...</td></tr>';

    try {
        reservations = await getReservations();
        renderReservations();
        renderReservationReport();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível atualizar as reservas.', 'error');
    }
}

async function finishReservation(reservationId) {
    clearMessage(adminMessage);

    const statusField = adminReservationsTable.querySelector(`[data-reservation-status="${reservationId}"]`);
    const reasonField = adminReservationsTable.querySelector(`[data-reservation-reason="${reservationId}"]`);

    if (!statusField) {
        return;
    }

    try {
        const updatedReservation = await updateReservationStatus(reservationId, {
            status: statusField.value,
            reason: reasonField?.value.trim() || '',
            admin: user
        });

        reservations = reservations.map((reservation) => reservation.id === reservationId ? updatedReservation : reservation);
        renderReservations();
        renderReservationReport();
        showMessage(adminMessage, 'Status da reserva atualizado. Esta alteração é definitiva.');
    } catch (error) {
        showMessage(adminMessage, error.message || 'Não foi possível atualizar o status da reserva.', 'error');
        await refreshReservations();
    }
}

async function deleteTable(tableId) {
    clearMessage(adminMessage);
    clearTimeout(tableAutosaveTimer);

    try {
        const linkedReservations = await getReservationsByTable(tableId);

        if (linkedReservations.length) {
            showMessage(adminMessage, 'Esta mesa possui reservas vinculadas e não pode ser excluída agora.', 'error');
            return;
        }

        await removeTable(tableId);
        showMessage(adminMessage, 'Mesa removida com sucesso.');
        resetForm();
        await loadData();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível remover a mesa.', 'error');
    }
}

tableForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(adminMessage);
    clearTimeout(tableAutosaveTimer);
    clearTableFieldInvalidStates();

    const formValues = getFormValues();
    const tableId = formValues.id;

    if (tableId) {
        await saveExistingTable(tableId, formValues, 'Mesa atualizada com sucesso.');
        return;
    }

    const validation = validateTableFormValues(formValues);
    if (!validation.valid) {
        setFieldInvalid(document.getElementById(validation.fieldId));
        showMessage(adminMessage, validation.message, 'error');
        return;
    }

    try {
        await saveTable(formValues);
        showMessage(adminMessage, 'Mesa cadastrada com sucesso.');
        await loadData();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível salvar a mesa.', 'error');
    }
});

resetFormButton?.addEventListener('click', () => {
    clearMessage(adminMessage);
    resetForm({ focusFirstField: true });
    renderMap();
});

rotateTableButton?.addEventListener('click', async () => {
    const rotationField = document.getElementById('rotacao');
    const tableId = document.getElementById('tableId').value;
    const previousRotation = normalizeRotation(rotationField.value);
    const nextRotation = normalizeRotation(rotationField.value) === 90 ? 0 : 90;

    rotationField.value = String(nextRotation);
    updateRotationDisplay();

    if (tableId) {
        const saved = await saveExistingTable(tableId, { rotacao: nextRotation }, 'Orientação da mesa salva automaticamente.');

        if (!saved) {
            rotationField.value = String(previousRotation);
            updateRotationDisplay();
        }
        return;
    }

    applyDefaultTablePosition();
});

tableForm?.addEventListener('input', (event) => {
    const fieldId = event.target.id;

    if (!['numero', 'capacidade', 'posicaoX', 'posicaoY'].includes(fieldId)) {
        return;
    }

    if (!document.getElementById('tableId').value && fieldId === 'capacidade') {
        applyDefaultTablePosition();
        return;
    }

    scheduleCurrentTableAutosave();
});

tableForm?.addEventListener('change', (event) => {
    const fieldId = event.target.id;

    if (!['numero', 'capacidade', 'posicaoX', 'posicaoY', 'status'].includes(fieldId)) {
        return;
    }

    if (!document.getElementById('tableId').value) {
        if (fieldId === 'capacidade') {
            applyDefaultTablePosition();
        }
        return;
    }

    scheduleCurrentTableAutosave();
});

refreshReservationsButton?.addEventListener('click', refreshReservations);
refreshMessagesButton?.addEventListener('click', refreshMessages);

openAdminMapButton?.addEventListener('click', openAdminMap);

closeAdminMapButton?.addEventListener('click', closeAdminMap);

adminMapModal?.addEventListener('click', (event) => {
    if (event.target === adminMapModal) {
        closeAdminMap();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && adminMapModal && !adminMapModal.classList.contains('hidden')) {
        closeAdminMap();
        return;
    }

    if (adminMapModal && !adminMapModal.classList.contains('hidden')) {
        trapFocus(event, adminMapModal);
    }
});

reservationFiltersForm?.addEventListener('submit', (event) => {
    event.preventDefault();
});

reservationDateFilter?.addEventListener('change', renderReservations);
reservationStatusFilter?.addEventListener('change', renderReservations);
reservationSearchFilter?.addEventListener('input', renderReservations);

reservationReportForm?.addEventListener('submit', (event) => {
    event.preventDefault();
});

reportStartDate?.addEventListener('change', renderReservationReport);
reportEndDate?.addEventListener('change', renderReservationReport);
reportStatusFilter?.addEventListener('change', renderReservationReport);
reportSearchFilter?.addEventListener('input', renderReservationReport);

clearReportFiltersButton?.addEventListener('click', () => {
    reportStartDate.value = '';
    reportEndDate.value = '';
    reportStatusFilter.value = '';
    reportSearchFilter.value = '';
    renderReservationReport();
});

clearReservationFiltersButton?.addEventListener('click', () => {
    reservationDateFilter.value = '';
    reservationStatusFilter.value = '';
    reservationSearchFilter.value = '';
    renderReservations();
});

adminReservationsTable?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-update-reservation-status]');

    if (!button) {
        return;
    }

    finishReservation(button.dataset.updateReservationStatus);
});

weeklyHoursForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(adminMessage);
    weeklyHoursForm.querySelectorAll('input, select').forEach((field) => setFieldInvalid(field, false));

    const nextConfig = collectWeeklyHoursConfig();
    const validation = validateOperatingConfig(nextConfig);

    if (!validation.valid) {
        setFieldInvalid(weeklyHoursForm.querySelector('input[type="time"]'));
        showMessage(adminMessage, validation.message, 'error');
        return;
    }

    try {
        await refreshReservationsForOperatingHours();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível conferir reservas ativas antes de salvar.', 'error');
        return;
    }

    const affectedReservation = findReservationAffectedBySchedule(nextConfig, operatingExceptions);

    if (affectedReservation) {
        showAffectedReservationMessage('Não foi possível salvar os horários semanais.', affectedReservation);
        return;
    }

    try {
        operatingConfig = await saveOperatingHoursConfig(nextConfig);
        renderOperatingHours();
        showMessage(adminMessage, 'Horários semanais atualizados.');
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível salvar os horários semanais.', 'error');
    }
});

exceptionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(adminMessage);
    exceptionForm.querySelectorAll('input, select').forEach((field) => setFieldInvalid(field, false));

    const nextException = collectException();

    if (!nextException.date) {
        setFieldInvalid(exceptionDate);
        showMessage(adminMessage, 'Informe a data da exceção.', 'error');
        return;
    }

    const validation = validateSchedule(nextException);

    if (!validation.valid) {
        setFieldInvalid(exceptionForm.querySelector('input[type="time"]'));
        showMessage(adminMessage, validation.message, 'error');
        return;
    }

    const nextExceptions = [
        ...operatingExceptions.filter((exception) => exception.date !== nextException.date),
        normalizeSchedule(nextException).open
            ? { ...nextException, ...normalizeSchedule(nextException) }
            : { ...nextException, open: false, shifts: [] }
    ];

    try {
        await refreshReservationsForOperatingHours();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível conferir reservas ativas antes de salvar.', 'error');
        return;
    }

    const affectedReservation = findReservationAffectedBySchedule(operatingConfig, nextExceptions);

    if (affectedReservation) {
        showAffectedReservationMessage(`Não foi possível alterar ${formatDate(nextException.date)}.`, affectedReservation);
        return;
    }

    try {
        await saveOperatingHourException(nextException);
        operatingExceptions = await getOperatingHourExceptions();
        resetExceptionForm();
        renderExceptions();
        showMessage(adminMessage, 'Exceção salva com sucesso.');
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível salvar a exceção.', 'error');
    }
});

clearExceptionFormButton?.addEventListener('click', () => {
    resetExceptionForm();
});

exceptionsList?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-exception]');
    const deleteButton = event.target.closest('[data-delete-exception]');

    if (editButton) {
        fillExceptionForm(editButton.dataset.editException);
        return;
    }

    if (!deleteButton) {
        return;
    }

    const date = deleteButton.dataset.deleteException;
    const nextExceptions = operatingExceptions.filter((exception) => exception.date !== date);

    try {
        await refreshReservationsForOperatingHours();
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível conferir reservas ativas antes de excluir.', 'error');
        return;
    }

    const affectedReservation = findReservationAffectedBySchedule(operatingConfig, nextExceptions);

    if (affectedReservation) {
        showAffectedReservationMessage(`Não foi possível excluir a exceção de ${formatDate(date)}.`, affectedReservation);
        return;
    }

    try {
        await removeOperatingHourException(date);
        operatingExceptions = await getOperatingHourExceptions();
        renderExceptions();
        showMessage(adminMessage, 'Exceção removida com sucesso.');
    } catch (error) {
        showMessage(adminMessage, 'Não foi possível remover a exceção.', 'error');
    }
});

adminMessagesList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-save-message-reply]');

    if (!button) {
        return;
    }

    saveMessageReply(button.dataset.saveMessageReply);
});

await loadData();
