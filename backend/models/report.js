const Reservation = require('./reservation');

async function getReservations(filters) {
    const reservations = await Reservation.findAll(filters);
    const totals = { total: reservations.length, ativa: 0, finalizada: 0, cancelada: 0, nao_compareceu: 0 };
    // Uma única leitura: totais e linhas nunca vêm de consultas em instantes diferentes.
    for (const reservation of reservations) totals[reservation.status] += 1;
    return { totals, reservations };
}

module.exports = { getReservations };
