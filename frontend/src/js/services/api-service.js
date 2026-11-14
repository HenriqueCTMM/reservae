export async function request(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.message || 'Não foi possível concluir a operação.');
        error.status = response.status;
        if (response.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') {
            window.dispatchEvent(new Event('reservae:session-expired'));
        }
        throw error;
    }
    return data;
}

export function watch(load, onChange, onError) {
    let stopped = false;
    let timer;
    let lastValue;
    let controller;
    async function poll() {
        controller = new AbortController();
        try {
            const data = await load(controller.signal);
            if (!stopped && JSON.stringify(data) !== lastValue) {
                lastValue = JSON.stringify(data);
                onChange(data);
            }
        } catch (error) {
            // A recuperação precisa reaplicar os dados, mesmo que sejam iguais aos anteriores.
            lastValue = undefined;
            if (!stopped) onError?.(error);
        } finally {
            if (!stopped) timer = setTimeout(poll, 3000);
        }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
}
