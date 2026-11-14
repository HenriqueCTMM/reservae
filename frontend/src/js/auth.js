import { request } from './services/api-service.js';

window.addEventListener('reservae:session-expired', () => {
    window.location.replace(getLoginUrl());
}, { once: true });

function stopAfterRedirect(url) {
    window.location.replace(url);
    return new Promise(() => {});
}

function getLoginUrl() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : './index.html';
}

function getRoleUrl(user) {
    const isPagesRoute = window.location.pathname.includes('/pages/');

    if (user.perfil === 'admin') {
        return isPagesRoute ? './admin.html' : './pages/admin.html';
    }

    return isPagesRoute ? './reservas.html' : './pages/reservas.html';
}

export async function logout() {
    await request('/auth/logout', { method: 'POST', body: '{}' });
    window.location.href = getLoginUrl();
}

export function redirectByUserRole(user) {
    window.location.href = getRoleUrl(user);
}

export async function protectRoute(allowedProfiles = []) {
    let profile;
    try {
        profile = await request('/auth/me');
    } catch (error) {
        if (error.status !== 401) {
            const notice = document.createElement('section');
            notice.className = 'rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700';
            notice.setAttribute('role', 'alert');
            const text = document.createElement('p');
            text.textContent = error.message || 'Não foi possível verificar sua sessão. Tente novamente.';
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'mt-4 rounded-xl border border-rose-300 px-4 py-2 font-semibold';
            retry.textContent = 'Recarregar página';
            retry.addEventListener('click', () => window.location.reload());
            notice.append(text, retry);
            document.querySelector('main').replaceChildren(notice);
            retry.focus();
            return new Promise(() => {});
        }
        return stopAfterRedirect(getLoginUrl());
    }

    if (allowedProfiles.length && !allowedProfiles.includes(profile.perfil)) {
        return stopAfterRedirect(getRoleUrl(profile));
    }

    return profile;
}
