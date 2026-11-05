import { logout, protectRoute } from './auth.js';
import { formatDuration } from './services/operating-hours-service.js';
import { getMyReservations } from './services/reservations-service.js';
import { escapeHtml, formatDate } from './ui.js';

const currentUser = await protectRoute(['cliente']);
const clientReservationsUserName = document.getElementById('clientReservationsUserName');
const logoutButton = document.getElementById('logoutButton');
const myReservationsList = document.getElementById('myReservationsList');
const reloadMyReservationsButton = document.getElementById('reloadMyReservationsButton');

clientReservationsUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

function getReservationStatusLabel(status) {
    const labels = {
        ativa: 'Ativa',
        finalizada: 'Finalizada',
        cancelada: 'Cancelada',
        nao_compareceu: 'Não compareceu'
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

    return 'bg-emerald-100 text-emerald-700';
}

async function renderMyReservations() {
    if (reloadMyReservationsButton.disabled) return;
    reloadMyReservationsButton.disabled = true;
    myReservationsList.setAttribute('aria-busy', 'true');
    myReservationsList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Carregando reservas...</div>';

    try {
        const reservations = await getMyReservations();
        myReservationsList.innerHTML = '';

        if (!reservations.length) {
            myReservationsList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Você ainda não possui reservas.</div>';
            return;
        }

        reservations.forEach((reservation) => {
            const card = document.createElement('article');
            const statusClasses = getReservationStatusClasses(reservation.status);

            card.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-5';
            card.innerHTML = `
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-lg font-bold">Mesa ${escapeHtml(reservation.mesaNumero)}</h3>
          <p class="text-sm text-slate-500">${escapeHtml(reservation.mesaCapacidade)} lugares</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}">${escapeHtml(getReservationStatusLabel(reservation.status))}</span>
      </div>
      <div class="space-y-2 text-sm text-slate-700">
        <p><strong>Data:</strong> ${escapeHtml(formatDate(reservation.data))}</p>
        <p><strong>Horário:</strong> ${escapeHtml(reservation.horario)} às ${escapeHtml(reservation.fimPrevisto)}</p>
        <p><strong>Permanência prevista:</strong> ${escapeHtml(formatDuration(reservation.duracaoMinutos))}</p>
        <p><strong>Pessoas:</strong> ${escapeHtml(reservation.pessoas)}</p>
      </div>
    `;
            myReservationsList.appendChild(card);
        });
    } catch (error) {
        myReservationsList.innerHTML = `<div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">${escapeHtml(error.message || 'Não foi possível carregar suas reservas. Tente recarregar.')}</div>`;
    } finally {
        myReservationsList.setAttribute('aria-busy', 'false');
        reloadMyReservationsButton.disabled = false;
    }
}

reloadMyReservationsButton.addEventListener('click', renderMyReservations);
await renderMyReservations();
