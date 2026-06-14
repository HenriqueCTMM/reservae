import { logout, protectRoute } from './auth.js';
import { formatDuration, getReservationPeriod } from './services/operating-hours-service.js';
import { getReservationsByUser } from './services/reservations-service.js';
import { getTables } from './services/tables-service.js';
import { formatDate } from './ui.js';

const currentUser = await protectRoute(['cliente']);
const clientReservationsUserName = document.getElementById('clientReservationsUserName');
const logoutButton = document.getElementById('logoutButton');
const myReservationsList = document.getElementById('myReservationsList');

clientReservationsUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

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

async function renderMyReservations() {
    myReservationsList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Carregando reservas...</div>';

    try {
        const reservations = await getReservationsByUser(currentUser.id);
        const tables = await getTables();
        myReservationsList.innerHTML = '';

        if (!reservations.length) {
            myReservationsList.innerHTML = '<div class="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Você ainda não possui reservas.</div>';
            return;
        }

        reservations.forEach((reservation) => {
            const table = tables.find((item) => item.id === reservation.mesaId);
            const card = document.createElement('article');
            const statusClasses = getReservationStatusClasses(reservation.status);
            const period = getReservationPeriod(reservation);
            const periodText = period.endTime ? `${reservation.horario} às ${period.endTime}` : reservation.horario;

            card.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-5';
            card.innerHTML = `
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-lg font-bold">Mesa ${table?.numero || reservation.mesaNumero || '-'}</h3>
          <p class="text-sm text-slate-500">${table?.capacidade || reservation.mesaCapacidade || '-'} lugares</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}">${getReservationStatusLabel(reservation.status)}</span>
      </div>
      <div class="space-y-2 text-sm text-slate-700">
        <p><strong>Data:</strong> ${formatDate(reservation.data)}</p>
        <p><strong>Horário:</strong> ${periodText}</p>
        <p><strong>Permanência prevista:</strong> ${formatDuration(period.durationMinutes)}</p>
        <p><strong>Pessoas:</strong> ${reservation.pessoas}</p>
      </div>
    `;
            myReservationsList.appendChild(card);
        });
    } catch (error) {
        myReservationsList.innerHTML = '<div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Não foi possível carregar suas reservas.</div>';
    }
}

await renderMyReservations();
