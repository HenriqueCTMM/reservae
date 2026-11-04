import { logout, protectRoute } from './auth.js';
import { clearMessage, escapeHtml, setFieldError, showMessage, trapFocus } from './ui.js';
import { formatDuration } from './services/operating-hours-service.js';
import { getAvailability, watchAvailability } from './services/availability-service.js';
import { createReservation } from './services/reservations-service.js';

const currentUser = await protectRoute(['cliente']);
const clientUserName = document.getElementById('clientUserName');
const logoutButton = document.getElementById('logoutButton');
const reservationForm = document.getElementById('reservationForm');
const reservationMessage = document.getElementById('reservationMessage');
const clientRestaurantMap = document.getElementById('clientRestaurantMap');
const clientRestaurantMapModal = document.getElementById('clientRestaurantMapModal');
const openMobileMapButton = document.getElementById('openMobileMapButton');
const mobileMapButtonHelp = document.getElementById('mobileMapButtonHelp');
const mobileMapModal = document.getElementById('mobileMapModal');
const closeMobileMapButton = document.getElementById('closeMobileMapButton');
const selectedTableBox = document.getElementById('selectedTableBox');
const reservationDate = document.getElementById('reservationDate');
const reservationTime = document.getElementById('reservationTime');
const reservationTimeHelp = document.getElementById('reservationTimeHelp');
const reservationPeople = document.getElementById('reservationPeople');
const reservationDateError = document.getElementById('reservationDateError');
const reservationTimeError = document.getElementById('reservationTimeError');
const reservationPeopleError = document.getElementById('reservationPeopleError');
const reservationTableError = document.getElementById('reservationTableError');
const mapStatusMessage = document.getElementById('mapStatusMessage');
const tableStatusList = document.getElementById('tableStatusList');
const reloadAvailabilityButton = document.getElementById('reloadAvailabilityButton');
const confirmReservationButton = document.getElementById('confirmReservationButton');

clientUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

let tables = [];
let availability = null;
let availabilityLoading = false;
let availabilityError = '';
let selectedTableId = null;
let stopWatchingAvailability = null;
let availabilityController = null;
let availabilityRequest = 0;
let reservationSaving = false;

function setMinDate() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
    reservationDate.min = `${parts.year}-${parts.month}-${parts.day}`;
}

function getSelectedTable() {
    return tables.find((item) => item.id === selectedTableId);
}

function getAvailabilityMessage() {
    if (reservationSaving) return 'Confirmando reserva...';
    if (!reservationDate.value) return 'Selecione uma data e um horário para visualizar as mesas.';
    const people = Number(reservationPeople.value);
    if (!Number.isInteger(people) || people < 1 || people > 8) return 'Informe uma quantidade inteira de 1 a 8 pessoas.';
    if (availabilityLoading) return 'Consultando disponibilidade...';
    if (availabilityError) return availabilityError;
    if (!availability) return 'Clique em Recarregar disponibilidade para consultar os horários.';
    if (availability.reason) return availability.reason;
    if (!reservationTime.value) return 'Selecione um horário para visualizar as mesas.';
    if (!canOpenTableMap()) return 'Escolha um horário disponível para esta quantidade de pessoas.';
    if (!tables.length) return 'Nenhuma mesa cadastrada.';
    return '';
}

function getMapMessageHtml(message, tone = 'muted') {
    const toneClasses = {
        muted: 'border-slate-200 bg-slate-50 text-slate-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        error: 'border-rose-200 bg-rose-50 text-rose-700'
    };

    return `
      <div class="app-map-message flex h-full min-h-64 items-center justify-center p-4 text-center">
         <div class="max-w-sm rounded-2xl border px-5 py-4 text-base font-semibold shadow-sm ${toneClasses[tone] || toneClasses.muted}">${escapeHtml(message)}</div>
      </div>
    `;
}

function canOpenTableMap() {
    return !reservationSaving && !availabilityLoading && !availabilityError && availability?.horarioPermitido
        && availability.data === reservationDate.value && availability.pessoas === Number(reservationPeople.value)
        && availability.horario === reservationTime.value;
}

function updateMobileMapButtonState() {
    const canOpenMap = canOpenTableMap();

    openMobileMapButton.disabled = !canOpenMap;
    mobileMapButtonHelp.classList.toggle('hidden', canOpenMap);
    reservationDate.disabled = reservationSaving;
    reservationPeople.disabled = reservationSaving;
    reloadAvailabilityButton.disabled = reservationSaving || availabilityLoading;
    confirmReservationButton.disabled = !canOpenMap || getSelectedTable()?.visualStatus !== 'disponivel';
    confirmReservationButton.textContent = reservationSaving ? 'Confirmando reserva...' : 'Confirmar reserva';
    reservationForm.setAttribute('aria-busy', String(reservationSaving));
}

function getTableVisualStatus(table) {
    return table.visualStatus || 'indisponivel';
}

function getTableStatusLabel(status) {
    const labels = {
        disponivel: 'Disponível',
        reservada: 'Reservada',
        indisponivel: 'Indisponível'
    };

    return labels[status] || 'Indisponível';
}

function getTableStatusReason(table) {
    return table.motivo || 'Mesa indisponível para os filtros atuais.';
}

function getMapSummaryText() {
    const message = getAvailabilityMessage();
    if (message) return message;

    const totals = tables.reduce((summary, table) => {
        const status = getTableVisualStatus(table);
        summary[status] += 1;
        return summary;
    }, { disponivel: 0, reservada: 0, indisponivel: 0 });

    return `${totals.disponivel} mesas disponíveis, ${totals.reservada} reservadas e ${totals.indisponivel} indisponíveis para os filtros atuais.`;
}

function announceMapSummary(message = getMapSummaryText()) {
    if (mapStatusMessage) {
        mapStatusMessage.textContent = message;
    }
}

function normalizeRotation(rotation) {
    const value = Number(rotation || 0);
    const normalizedValue = ((value % 360) + 360) % 360;

    return normalizedValue === 90 || normalizedValue === 270 ? 90 : 0;
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

function updateSelectedTableBox() {
    const table = getSelectedTable();

    if (!table) {
        selectedTableId = null;
        selectedTableBox.textContent = 'Nenhuma mesa selecionada';
        selectedTableBox.className = 'rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-500';
        openMobileMapButton.textContent = 'Selecionar mesa';
        updateMobileMapButtonState();
        return;
    }

    const durationMinutes = availability.duracaoMinutos;
    selectedTableBox.textContent = `Mesa ${table.numero} • ${table.capacidade} lugares • permanência prevista ${formatDuration(durationMinutes)}`;
    selectedTableBox.className = 'rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700';
    openMobileMapButton.textContent = 'Trocar mesa';
    updateMobileMapButtonState();
}

function clearReservationFieldErrors() {
    setFieldError(reservationDate, reservationDateError);
    setFieldError(reservationTime, reservationTimeError);
    setFieldError(reservationPeople, reservationPeopleError);
    setFieldError(selectedTableBox, reservationTableError);
}

function selectTable(table, { closeOnSelect = false, focusVisualMap = false } = {}) {
    table = tables.find((item) => item.id === table.id);
    if (!table || !canOpenTableMap() || getTableVisualStatus(table) !== 'disponivel') return;
    selectedTableId = table.id;
    setFieldError(selectedTableBox, reservationTableError);
    updateSelectedTableBox();
    renderMap();
    announceMapSummary(`Mesa ${table.numero} selecionada. ${table.capacidade} lugares.`);

    if (focusVisualMap) {
        document.querySelector(`[data-table-id="${table.id}"]`)?.focus({ preventScroll: true });
    }

    if (closeOnSelect) {
        closeMobileMap();
    }
}

function renderTableStatusSummary() {
    if (!tableStatusList) {
        return;
    }

    const message = getAvailabilityMessage();
    if (message) {
        tableStatusList.innerHTML = `<p class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-2 lg:col-span-3">${escapeHtml(message)}</p>`;
        announceMapSummary();
        return;
    }

    tableStatusList.innerHTML = tables.map((table) => {
        const status = getTableVisualStatus(table);
        const isAvailable = status === 'disponivel';
        const isSelected = selectedTableId === table.id;
        const statusClasses = isAvailable
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : status === 'reservada'
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-slate-200 bg-slate-50 text-slate-700';

        return `
          <div class="rounded-2xl border p-4 ${statusClasses}">
            <h3 class="font-bold">Mesa ${table.numero}</h3>
            <p class="text-sm">${table.capacidade} lugares. Status: ${getTableStatusLabel(status)}.</p>
             <p class="text-sm">${escapeHtml(getTableStatusReason(table))}</p>
            ${isSelected ? '<p class="mt-2 text-sm font-bold">Mesa selecionada.</p>' : ''}
            ${isAvailable ? `<button type="button" data-select-table-summary="${table.id}" aria-pressed="${String(isSelected)}" class="mt-3 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Selecionar mesa ${table.numero}</button>` : ''}
          </div>
        `;
    }).join('');
    announceMapSummary();
}

function closeMobileMap() {
    mobileMapModal.classList.add('hidden');
    document.body.style.overflow = '';
    openMobileMapButton.focus({ preventScroll: true });
}

function openMobileMap() {
    if (!canOpenTableMap()) {
        return;
    }

    renderMap();
    mobileMapModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    closeMobileMapButton.focus({ preventScroll: true });
}

function renderMapContainer(container, { closeOnSelect = false } = {}) {
    container.innerHTML = '';

    const message = getAvailabilityMessage();
    if (message) {
        container.innerHTML = getMapMessageHtml(message, availabilityError ? 'error' : 'muted');
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
        button.setAttribute('aria-label', `Mesa ${table.numero}, ${table.capacidade} lugares, ${getTableStatusLabel(visualStatus).toLowerCase()}${isSelected ? ', selecionada' : ''}. ${getTableStatusReason(table, visualStatus)}`);

        if (visualStatus === 'disponivel') {
            button.setAttribute('aria-pressed', String(isSelected));
        }

        button.className = `absolute flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-80 ${statusClassMap[visualStatus]} ${isSelected ? 'ring-4 ring-slate-300' : ''}`;
        button.style.left = `${table.posicaoX}px`;
        button.style.top = `${table.posicaoY}px`;
        applyTableSize(button, table);
        button.innerHTML = `
      <span>Mesa ${table.numero}</span>
      <span class="text-xs font-medium">${table.capacidade} lugares</span>
      <span class="text-xs font-bold">${getTableStatusLabel(visualStatus)}</span>
    `;

        if (visualStatus === 'disponivel') {
            button.addEventListener('click', () => {
                selectTable(table, { closeOnSelect, focusVisualMap: !closeOnSelect });
            });
        } else {
            button.disabled = true;
        }

        container.appendChild(button);
    });
}

function renderMap() {
    renderMapContainer(clientRestaurantMap);
    renderMapContainer(clientRestaurantMapModal, { closeOnSelect: true });
    renderTableStatusSummary();
}

function renderReservationTimeOptions() {
    const selectedTime = availability?.horario || reservationTime.value;
    const slots = availability?.slots || [];
    reservationTime.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = availabilityLoading ? 'Consultando horários...' : slots.length ? 'Selecione um horário' : 'Sem horários carregados';
    reservationTime.appendChild(placeholder);
    slots.forEach((slot) => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        reservationTime.appendChild(option);
    });

    if (slots.includes(selectedTime)) reservationTime.value = selectedTime;
    reservationTime.disabled = reservationSaving || availabilityLoading || !slots.length;
    reservationTimeHelp.textContent = availability?.reason || (availability
        ? `Permanência prevista: ${formatDuration(availability.duracaoMinutos)}. Horários calculados pelo restaurante, com antecedência mínima de 3 horas.`
        : 'Selecione data e quantidade de pessoas para consultar os horários.');
    updateMobileMapButtonState();
}

function stopAvailabilityRealtime() {
    stopWatchingAvailability?.();
    stopWatchingAvailability = null;
    availabilityController?.abort();
    availabilityController = null;
}

function applyAvailability(result) {
    if (availabilityError) clearMessage(reservationMessage);
    availabilityError = '';
    availabilityLoading = false;
    reloadAvailabilityButton.disabled = false;
    availability = result;
    tables = result.mesas;
    const selected = getSelectedTable();
    const lostSelection = selectedTableId && (!selected || getTableVisualStatus(selected) !== 'disponivel' || !result.horarioPermitido);
    if (lostSelection) {
        selectedTableId = null;
        setFieldError(selectedTableBox, reservationTableError, 'A mesa selecionada não está mais disponível. Escolha outra mesa.');
    }
    renderReservationTimeOptions();
    updateSelectedTableBox();
    renderMap();
    if (lostSelection) announceMapSummary('A mesa selecionada não está mais disponível. Escolha outra mesa.');
    if (!result.horarioPermitido) stopAvailabilityRealtime();
}

function showAvailabilityError(error) {
    const message = error.message || 'Não foi possível consultar a disponibilidade. Tente recarregar.';
    const changed = availabilityError !== message;
    availabilityLoading = false;
    reloadAvailabilityButton.disabled = false;
    availabilityError = message;
    availability = null;
    tables = [];
    selectedTableId = null;
    renderReservationTimeOptions();
    updateSelectedTableBox();
    renderMap();
    if (changed) showMessage(reservationMessage, message, 'error');
}

async function refreshAvailability() {
    if (reservationSaving) return;
    stopAvailabilityRealtime();
    const requestId = ++availabilityRequest;
    const filters = { data: reservationDate.value, pessoas: Number(reservationPeople.value), horario: reservationTime.value };
    availability = null;
    availabilityError = '';
    tables = [];
    selectedTableId = null;
    availabilityLoading = Boolean(filters.data && Number.isInteger(filters.pessoas) && filters.pessoas >= 1 && filters.pessoas <= 8);
    reloadAvailabilityButton.disabled = availabilityLoading;
    renderReservationTimeOptions();
    updateSelectedTableBox();
    renderMap();
    if (!availabilityLoading) return;

    const onChange = (result) => { if (requestId === availabilityRequest) applyAvailability(result); };
    const onError = (error) => { if (requestId === availabilityRequest) showAvailabilityError(error); };
    if (filters.horario) {
        stopWatchingAvailability = watchAvailability(filters, onChange, onError);
    } else {
        availabilityController = new AbortController();
        try {
            onChange(await getAvailability(filters, { signal: availabilityController.signal }));
        } catch (error) {
            if (error.name !== 'AbortError') onError(error);
        }
    }
}

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (reservationSaving) return;
    clearMessage(reservationMessage);
    clearReservationFieldErrors();
    if (!canOpenTableMap() || getSelectedTable()?.visualStatus !== 'disponivel') {
        setFieldError(selectedTableBox, reservationTableError, 'Selecione os filtros e uma mesa disponível antes de confirmar.');
        return;
    }
    const data = {
        mesaId: selectedTableId, data: reservationDate.value,
        horario: reservationTime.value, pessoas: Number(reservationPeople.value)
    };
    reservationSaving = true;
    availabilityRequest += 1;
    stopAvailabilityRealtime();
    if (!mobileMapModal.classList.contains('hidden')) closeMobileMap();
    renderReservationTimeOptions();
    renderMap();
    let message;
    let tone;
    try {
        const reservation = await createReservation(data);
        const date = reservation.data.split('-').reverse().join('/');
        message = `Reserva confirmada! Mesa ${reservation.mesaNumero}, dia ${date}, das ${reservation.horario} às ${reservation.fimPrevisto}, para ${reservation.pessoas} pessoa(s).`;
        tone = 'success';
    } catch (error) {
        message = error.message || 'Não foi possível confirmar a reserva. Recarregue a disponibilidade e tente novamente.';
        tone = 'error';
    } finally {
        reservationSaving = false;
        // Limpar a seleção e consultar o estado real após sucesso ou rejeição, sem repetir o POST.
        await refreshAvailability();
        showMessage(reservationMessage, message, tone);
    }
});

reservationDate.addEventListener('change', () => {
    clearMessage(reservationMessage);
    clearReservationFieldErrors();
    reservationTime.value = '';
    refreshAvailability();
});

reservationTime.addEventListener('change', () => {
    clearReservationFieldErrors();
    clearMessage(reservationMessage);
    refreshAvailability();
});

reservationPeople.addEventListener('input', () => {
    clearMessage(reservationMessage);
    clearReservationFieldErrors();
    refreshAvailability();
});

reloadAvailabilityButton.addEventListener('click', () => {
    clearMessage(reservationMessage);
    clearReservationFieldErrors();
    setMinDate();
    refreshAvailability();
});

openMobileMapButton.addEventListener('click', openMobileMap);

closeMobileMapButton.addEventListener('click', closeMobileMap);

tableStatusList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-table-summary]');

    if (!button) {
        return;
    }

    const table = tables.find((item) => item.id === button.dataset.selectTableSummary);

    if (!table || getTableVisualStatus(table) !== 'disponivel') {
        return;
    }

    selectTable(table);
    tableStatusList.querySelector(`[data-select-table-summary="${table.id}"]`)?.focus({ preventScroll: true });
});

mobileMapModal.addEventListener('click', (event) => {
    if (event.target === mobileMapModal) {
        closeMobileMap();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileMapModal.classList.contains('hidden')) {
        closeMobileMap();
        return;
    }

    if (!mobileMapModal.classList.contains('hidden')) {
        trapFocus(event, mobileMapModal);
    }
});

window.addEventListener('beforeunload', () => {
    availabilityRequest += 1;
    stopAvailabilityRealtime();
});

setMinDate();
await refreshAvailability();
