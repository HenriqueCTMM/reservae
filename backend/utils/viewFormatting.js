const reservationStatuses = {
    ativa: { label: 'Ativa', classes: 'bg-emerald-100 text-emerald-700' },
    finalizada: { label: 'Finalizada', classes: 'bg-sky-100 text-sky-700' },
    cancelada: { label: 'Cancelada', classes: 'bg-rose-100 text-rose-700' },
    nao_compareceu: { label: 'Não compareceu', classes: 'bg-amber-100 text-amber-700' }
};

function reservationStatus(status) {
    return reservationStatuses[status] || { label: status, classes: 'bg-slate-200 text-slate-700' };
}

function formatDate(date) {
    // Data civil do restaurante: não converter para outro dia pelo fuso do servidor.
    return date.split('-').reverse().join('/');
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours}h${String(remainingMinutes).padStart(2, '0')}` : `${hours}h`;
}

function formatDateTime(timestamp) {
    if (!timestamp) return 'data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
    }).format(new Date(Number(timestamp)));
}

module.exports = { reservationStatus, formatDate, formatDuration, formatDateTime };
