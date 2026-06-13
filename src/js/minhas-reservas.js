import { logout, protectRoute } from './auth.js';
import { getReservationsByUser } from './services/reservations-service.js';
import { getTables } from './services/tables-service.js';
import { formatDate } from './ui.js';

const currentUser = await protectRoute(['cliente']);
const clientReservationsUserName = document.getElementById('clientReservationsUserName');
const logoutButton = document.getElementById('logoutButton');
const myReservationsList = document.getElementById('myReservationsList');

clientReservationsUserName.textContent = currentUser.nome;
logoutButton.addEventListener('click', logout);

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
            card.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-5';
            card.innerHTML = `
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-bold">Mesa ${table?.numero || reservation.mesaNumero || '-'}</h3>
          <p class="text-sm text-slate-500">${table?.capacidade || '-'} lugares</p>
        </div>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">${reservation.status}</span>
      </div>
      <div class="space-y-2 text-sm text-slate-700">
        <p><strong>Data:</strong> ${formatDate(reservation.data)}</p>
        <p><strong>Horário:</strong> ${reservation.horario}</p>
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
