export function showMessage(element, message, type = 'success') {
    element.textContent = message;
    element.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-700', 'bg-rose-100', 'text-rose-700');

    if (type === 'success') {
        element.classList.add('bg-emerald-100', 'text-emerald-700');
        return;
    }

    element.classList.add('bg-rose-100', 'text-rose-700');
}

export function clearMessage(element) {
    element.textContent = '';
    element.classList.add('hidden');
}

export function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T00:00:00`));
}