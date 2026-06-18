export function showMessage(element, message, type = 'success') {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.tabIndex = -1;
    element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    element.setAttribute('aria-atomic', 'true');
    element.setAttribute('role', type === 'error' ? 'alert' : 'status');
    element.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-700', 'bg-rose-100', 'text-rose-700');

    if (type === 'success') {
        element.classList.add('bg-emerald-100', 'text-emerald-700');
        return;
    }

    element.classList.add('bg-rose-100', 'text-rose-700');
    element.focus();
}

export function clearMessage(element) {
    if (!element) {
        return;
    }

    element.textContent = '';
    element.classList.add('hidden');
    element.removeAttribute('tabindex');
    element.removeAttribute('role');
}

export function setFieldInvalid(field, invalid = true) {
    if (!field) {
        return;
    }

    if (invalid) {
        field.setAttribute('aria-invalid', 'true');
        return;
    }

    field.removeAttribute('aria-invalid');
}

export function setFieldError(field, errorElement, message = '') {
    setFieldInvalid(field, Boolean(message));

    if (!errorElement) {
        return;
    }

    errorElement.textContent = message;
    errorElement.classList.toggle('hidden', !message);
}

export function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) {
        return;
    }

    const focusableElements = Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null || element === document.activeElement);

    if (!focusableElements.length) {
        event.preventDefault();
        container.focus?.();
        return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
}

export function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T00:00:00`));
}

export function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
