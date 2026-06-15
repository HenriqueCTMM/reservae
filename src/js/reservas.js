import { logout, protectRoute } from './auth.js';
import { clearMessage, formatDate, setFieldError, showMessage, trapFocus } from './ui.js';
import {
    CLOSED_DATE_MESSAGE,
    formatDuration,
    getOperatingHourExceptions,
    getOperatingHoursConfig,
    getReservationDurationMinutes,
    getReservationEndTime,
    getScheduleForDate,
    hasReservationConflictForPeriod,
    getReservationSlotsForDate,
    isTimeAllowedForPeople
} from './services/operating-hours-service.js';
import { createReservation, getReservationsByDate, watchReservationsByDate } from './services/reservations-service.js';
import { watchTables } from './services/tables-service.js';

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

clientUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

let tables = [];
let reservations = [];
let operatingConfig = null;
let operatingExceptions = [];
let selectedTableId = null;
let stopWatchingReservations = null;
let stopWatchingTables = null;

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    reservationDate.min = today;
}

function getSelectedTable() {
    return tables.find((item) => item.id === selectedTableId);
}

function isSelectedDateClosed() {
    if (!reservationDate.value || !operatingConfig) {
        return false;
    }

    return !getScheduleForDate(reservationDate.value, operatingConfig, operatingExceptions).open;
}

function renderClosedDateMapMessage(container) {
    container.innerHTML = getMapMessageHtml(CLOSED_DATE_MESSAGE, 'warning');
}

function getMapMessageHtml(message, tone = 'muted') {
    const toneClasses = {
        muted: 'border-slate-200 bg-slate-50 text-slate-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        error: 'border-rose-200 bg-rose-50 text-rose-700'
    };

    return `
      <div class="app-map-message flex h-full min-h-64 items-center justify-center p-4 text-center">
        <div class="max-w-sm rounded-2xl border px-5 py-4 text-base font-semibold shadow-sm ${toneClasses[tone] || toneClasses.muted}">${message}</div>
      </div>
    `;
}

function canOpenTableMap() {
    const people = Number(reservationPeople.value);

    if (!reservationDate.value || !reservationTime.value || people < 1 || people > 8 || isSelectedDateClosed() || !operatingConfig) {
        return false;
    }

    return isTimeAllowedForPeople(reservationDate.value, reservationTime.value, people, operatingConfig, operatingExceptions);
}

function updateMobileMapButtonState() {
    const canOpenMap = canOpenTableMap();

    openMobileMapButton.disabled = !canOpenMap;
    mobileMapButtonHelp.classList.toggle('hidden', canOpenMap);
}

function isTableReserved(tableId, date, time) {
    const people = Number(reservationPeople.value);

    if (!date || !time || !people || !operatingConfig) {
        return false;
    }

    return hasReservationConflictForPeriod({
        mesaId: tableId,
        data: date,
        horario: time,
        pessoas: people
    }, reservations);
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

function getTableStatusLabel(status) {
    const labels = {
        disponivel: 'Disponível',
        reservada: 'Reservada',
        indisponivel: 'Indisponível'
    };

    return labels[status] || 'Indisponível';
}

function getTableStatusReason(table, status) {
    const people = Number(reservationPeople.value);

    if (status === 'disponivel') {
        return 'Pode ser selecionada para esta reserva.';
    }

    if (table.status === 'indisponivel') {
        return 'Mesa marcada como indisponível pelo restaurante.';
    }

    if (people && people > table.capacidade) {
        return `Capacidade menor que ${people} pessoas.`;
    }

    if (status === 'reservada') {
        return 'Mesa já reservada neste horário.';
    }

    return 'Mesa indisponível para os filtros atuais.';
}

function getMapSummaryText() {
    if (!reservationDate.value || !reservationTime.value || !tables.length) {
        return 'Mapa de mesas aguardando data, horário e mesas cadastradas.';
    }

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

    const people = Number(reservationPeople.value || 1);
    const durationMinutes = getReservationDurationMinutes(people);
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

    if (!reservationDate.value || !reservationTime.value) {
        tableStatusList.innerHTML = '<p class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-2 lg:col-span-3">Escolha data e horário para ver a lista de mesas disponíveis, reservadas e indisponíveis.</p>';
        announceMapSummary();
        return;
    }

    if (!tables.length) {
        tableStatusList.innerHTML = '<p class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-2 lg:col-span-3">Nenhuma mesa cadastrada.</p>';
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
            <p class="text-sm">${getTableStatusReason(table, status)}</p>
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

    if (!reservationDate.value) {
        container.innerHTML = getMapMessageHtml('Selecione uma data e um horário para visualizar o mapa de mesas.');
        return;
    }

    if (isSelectedDateClosed()) {
        renderClosedDateMapMessage(container);
        return;
    }

    if (!reservationTime.value) {
        container.innerHTML = getMapMessageHtml('Selecione um horário para visualizar o mapa de mesas.');
        return;
    }

    if (Number(reservationPeople.value) < 1 || Number(reservationPeople.value) > 8) {
        container.innerHTML = getMapMessageHtml('A quantidade de pessoas deve estar entre 1 e 8.', 'warning');
        return;
    }

    if (!isTimeAllowedForPeople(reservationDate.value, reservationTime.value, Number(reservationPeople.value), operatingConfig, operatingExceptions)) {
        container.innerHTML = getMapMessageHtml('O horário selecionado não está disponível para esta quantidade de pessoas. Escolha outro horário.');
        return;
    }

    if (!tables.length) {
        container.innerHTML = getMapMessageHtml('Nenhuma mesa cadastrada.');
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

function validateReservationData() {
    const date = reservationDate.value;
    const time = reservationTime.value;
    const people = Number(reservationPeople.value);
    const table = getSelectedTable();

    clearReservationFieldErrors();

    if (!date || !people) {
        setFieldError(reservationDate, reservationDateError, !date ? 'Informe a data da reserva.' : '');
        setFieldError(reservationPeople, reservationPeopleError, !people ? 'Informe a quantidade de pessoas.' : '');
        showMessage(reservationMessage, 'Preencha data e quantidade de pessoas.', 'error');
        return false;
    }

    if (people < 1 || people > 8) {
        setFieldError(reservationPeople, reservationPeopleError, 'Informe de 1 a 8 pessoas.');
        showMessage(reservationMessage, 'A quantidade de pessoas deve estar entre 1 e 8.', 'error');
        return false;
    }

    if (!operatingConfig) {
        showMessage(reservationMessage, 'Aguarde o carregamento dos horários de funcionamento.', 'error');
        return false;
    }

    if (isSelectedDateClosed()) {
        showMessage(reservationMessage, CLOSED_DATE_MESSAGE, 'error');
        return false;
    }

    if (!time) {
        setFieldError(reservationTime, reservationTimeError, 'Escolha um horário disponível.');
        showMessage(reservationMessage, 'Escolha um horário disponível.', 'error');
        return false;
    }

    if (!isTimeAllowedForPeople(date, time, people, operatingConfig, operatingExceptions)) {
        setFieldError(reservationTime, reservationTimeError, 'Escolha um horário conforme o funcionamento do restaurante.');
        showMessage(reservationMessage, 'Escolha um horário disponível conforme o funcionamento do restaurante.', 'error');
        return false;
    }

    if (!table) {
        setFieldError(selectedTableBox, reservationTableError, 'Selecione uma mesa disponível no mapa ou na lista acessível.');
        showMessage(reservationMessage, 'Selecione uma mesa disponível no mapa.', 'error');
        return false;
    }

    if (people > table.capacidade) {
        setFieldError(reservationPeople, reservationPeopleError, 'A quantidade excede a capacidade da mesa selecionada.');
        showMessage(reservationMessage, 'A quantidade de pessoas excede a capacidade da mesa selecionada.', 'error');
        return false;
    }

    if (table.status === 'indisponivel') {
        setFieldError(selectedTableBox, reservationTableError, 'A mesa selecionada está indisponível.');
        showMessage(reservationMessage, 'Esta mesa está indisponível.', 'error');
        return false;
    }

    if (isTableReserved(table.id, date, time)) {
        setFieldError(selectedTableBox, reservationTableError, 'A mesa selecionada já está reservada para este horário.');
        showMessage(reservationMessage, 'Esta mesa já está reservada para a data e horário selecionados.', 'error');
        return false;
    }

    return true;
}

function renderReservationTimeOptions() {
    const selectedTime = reservationTime.value;
    const people = Number(reservationPeople.value || 1);
    const durationMinutes = getReservationDurationMinutes(people);
    reservationTime.innerHTML = '';

    if (!reservationDate.value || !operatingConfig) {
        reservationTime.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        reservationTimeHelp.textContent = `Os horários seguem o funcionamento do restaurante. Permanência prevista: ${formatDuration(durationMinutes)}.`;
        updateMobileMapButtonState();
        return;
    }

    const { slots, reason, closed } = getReservationSlotsForDate(reservationDate.value, operatingConfig, operatingExceptions, new Date(), people);
    const shouldKeepSelectedTime = Boolean(selectedTime && slots.includes(selectedTime));
    const selectedTimeBecameUnavailable = Boolean(selectedTime && !slots.includes(selectedTime));

    if (!slots.length) {
        if (selectedTimeBecameUnavailable && !closed) {
            reservationTime.innerHTML = `<option value="${selectedTime}" selected>${selectedTime} indisponível para ${people} pessoas</option>`;
        } else {
            reservationTime.innerHTML = '<option value="">Sem horários disponíveis</option>';
        }

        reservationTimeHelp.textContent = reason || 'Não há horários disponíveis para esta data. Escolha outro dia.';

        if (closed) {
            selectedTableId = null;
            updateSelectedTableBox();
        }

        updateMobileMapButtonState();
        return;
    }

    reservationTime.innerHTML = '<option value="">Selecione um horário</option>';

    if (selectedTimeBecameUnavailable) {
        const unavailableOption = document.createElement('option');
        unavailableOption.value = selectedTime;
        unavailableOption.textContent = `${selectedTime} indisponível para ${people} pessoas`;
        reservationTime.appendChild(unavailableOption);
    }

    slots.forEach((slot) => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        reservationTime.appendChild(option);
    });

    if (shouldKeepSelectedTime || selectedTimeBecameUnavailable) {
        reservationTime.value = selectedTime;
    }

    reservationTimeHelp.textContent = selectedTimeBecameUnavailable
        ? `O horário selecionado não comporta ${people} pessoas. Escolha outro horário disponível.`
        : `Permanência prevista: ${formatDuration(durationMinutes)}. Reservas para hoje exigem pelo menos 3 horas de antecedência.`;
    updateMobileMapButtonState();
}

function stopReservationsRealtime() {
    if (stopWatchingReservations) {
        stopWatchingReservations();
        stopWatchingReservations = null;
    }
}

function stopTablesRealtime() {
    if (stopWatchingTables) {
        stopWatchingTables();
        stopWatchingTables = null;
    }
}

function watchTablesRealtime() {
    stopTablesRealtime();

    stopWatchingTables = watchTables(
        (restaurantTables) => {
            tables = restaurantTables;
            const selectedTable = getSelectedTable();
            let mapAnnouncement = '';

            if (selectedTable && selectedTable.status !== 'disponivel') {
                selectedTableId = null;
                setFieldError(selectedTableBox, reservationTableError, 'A mesa selecionada ficou indisponível. Escolha outra mesa.');
                updateSelectedTableBox();
                mapAnnouncement = 'A mesa selecionada ficou indisponível. Escolha outra mesa.';
            }

            renderMap();

            if (mapAnnouncement) {
                announceMapSummary(mapAnnouncement);
            }
        },
        () => {
            tables = [];
            clientRestaurantMap.innerHTML = '<div class="flex h-full items-center justify-center px-4 text-center text-rose-600">Não foi possível acompanhar as mesas em tempo real.</div>';
            clientRestaurantMapModal.innerHTML = '<div class="flex h-full items-center justify-center px-4 text-center text-rose-600">Não foi possível acompanhar as mesas em tempo real.</div>';
            showMessage(reservationMessage, 'Não foi possível acompanhar as mesas em tempo real.', 'error');
        }
    );
}

function watchSelectedDateReservations() {
    stopReservationsRealtime();
    reservations = [];

    if (!reservationDate.value || !reservationTime.value) {
        renderMap();
        return;
    }

    if (isSelectedDateClosed()) {
        renderMap();
        return;
    }

    clientRestaurantMap.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400">Carregando reservas do dia...</div>';
    clientRestaurantMapModal.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400">Carregando reservas do dia...</div>';

    stopWatchingReservations = watchReservationsByDate(
        reservationDate.value,
        (dayReservations) => {
            reservations = dayReservations;
            const selectedTable = getSelectedTable();
            let mapAnnouncement = '';

            if (selectedTable && getTableVisualStatus(selectedTable) !== 'disponivel') {
                selectedTableId = null;
                setFieldError(selectedTableBox, reservationTableError, 'A mesa selecionada ficou indisponível para este horário. Escolha outra mesa.');
                updateSelectedTableBox();
                mapAnnouncement = 'A mesa selecionada ficou indisponível para este horário. Escolha outra mesa.';
            }

            renderMap();

            if (mapAnnouncement) {
                announceMapSummary(mapAnnouncement);
            }
        },
        () => {
            reservations = [];
            clientRestaurantMap.innerHTML = '<div class="flex h-full items-center justify-center px-4 text-center text-rose-600">Não foi possível acompanhar as reservas desta data em tempo real.</div>';
            clientRestaurantMapModal.innerHTML = '<div class="flex h-full items-center justify-center px-4 text-center text-rose-600">Não foi possível acompanhar as reservas desta data em tempo real.</div>';
            showMessage(reservationMessage, 'Não foi possível acompanhar as reservas desta data em tempo real.', 'error');
        }
    );
}

async function loadData() {
    clientRestaurantMap.innerHTML = '<div class="flex h-full items-center justify-center px-4 text-center text-slate-400">Selecione uma data para carregar as mesas.</div>';

    try {
        operatingConfig = await getOperatingHoursConfig();
        operatingExceptions = await getOperatingHourExceptions();
        renderReservationTimeOptions();
    } catch (error) {
        showMessage(reservationMessage, 'Não foi possível carregar os horários de funcionamento.', 'error');
    }

    watchTablesRealtime();
}

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(reservationMessage);

    if (!validateReservationData()) {
        return;
    }

    const table = getSelectedTable();
    const people = Number(reservationPeople.value);
    const durationMinutes = getReservationDurationMinutes(people);
    const newReservation = {
        usuarioId: currentUser.id,
        usuarioNome: currentUser.nome,
        usuarioEmail: currentUser.email,
        mesaId: table.id,
        mesaNumero: table.numero,
        mesaCapacidade: table.capacidade,
        data: reservationDate.value,
        horario: reservationTime.value,
        pessoas: people,
        duracaoMinutos: durationMinutes,
        fimPrevisto: getReservationEndTime(reservationTime.value, durationMinutes),
        status: 'ativa'
    };

    try {
        reservations = await getReservationsByDate(newReservation.data);
        const conflict = hasReservationConflictForPeriod(newReservation, reservations);

        if (conflict) {
            renderMap();
            setFieldError(selectedTableBox, reservationTableError, 'A mesa selecionada ficou indisponível neste período.');
            showMessage(reservationMessage, 'Esta mesa está indisponível neste período. Escolha outra mesa ou horário.', 'error');
            return;
        }

        const createdReservation = await createReservation(newReservation);
        reservations = [...reservations.filter((reservation) => reservation.id !== createdReservation.id), createdReservation];
        showMessage(reservationMessage, `Reserva confirmada para a Mesa ${table.numero} em ${formatDate(newReservation.data)} das ${newReservation.horario} às ${newReservation.fimPrevisto}.`);

        reservationForm.reset();
        stopReservationsRealtime();
        reservations = [];
        selectedTableId = null;
        clearReservationFieldErrors();
        updateSelectedTableBox();
        setMinDate();
        renderReservationTimeOptions();
        renderMap();
    } catch (error) {
        showMessage(reservationMessage, 'Não foi possível salvar a reserva. Tente novamente.', 'error');
    }
});

reservationDate.addEventListener('change', () => {
    clearMessage(reservationMessage);
    clearReservationFieldErrors();
    selectedTableId = null;
    updateSelectedTableBox();
    renderReservationTimeOptions();

    if (isSelectedDateClosed()) {
        showMessage(reservationMessage, CLOSED_DATE_MESSAGE, 'error');
    }

    watchSelectedDateReservations();
});

reservationTime.addEventListener('change', () => {
    clearReservationFieldErrors();
    selectedTableId = null;
    updateSelectedTableBox();
    watchSelectedDateReservations();
});

reservationPeople.addEventListener('input', () => {
    clearMessage(reservationMessage);
    clearReservationFieldErrors();
    const table = getSelectedTable();

    renderReservationTimeOptions();

    if (table && getTableVisualStatus(table) !== 'disponivel') {
        selectedTableId = null;
    }

    updateSelectedTableBox();
    renderMap();
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
    stopReservationsRealtime();
    stopTablesRealtime();
});

setMinDate();
await loadData();
