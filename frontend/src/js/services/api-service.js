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
        throw error;
    }
    return data;
}

export const createTimestamp = () => Date.now();
const read = (collection, params = {}) => request(`/data?${new URLSearchParams({ collection, ...params })}`);
const write = (collection, operation, id, data) => request('/data', {
    method: 'POST', body: JSON.stringify({ collection, operation, id, data })
});
export const getCollection = (path) => read(path);
export const getById = (path, id) => read(path, { id });
export const getValue = (path) => getById(path, 'config');
export const setValue = (path, data) => write(path, 'set', 'config', data);
export const setById = (path, id, data) => write(path, 'set', id, data);
export const createWithPush = (path, data) => write(path, 'create', undefined, data);
export const updateById = (path, id, data) => write(path, 'update', id, data);
export const removeById = (path, id) => write(path, 'delete', id);
export const queryByChild = (path, field, value) => read(path, { field, value });

function watch(load, onChange, onError) {
    let stopped = false;
    let timer;
    let lastValue;
    async function poll() {
        try {
            const data = await load();
            if (!stopped && JSON.stringify(data) !== lastValue) {
                lastValue = JSON.stringify(data);
                onChange(data);
            }
        } catch (error) {
            if (!stopped) onError?.(error);
        } finally {
            if (!stopped) timer = setTimeout(poll, 3000);
        }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); };
}
export const watchCollection = (path, onChange, onError) => watch(() => getCollection(path), onChange, onError);
export const watchByChild = (path, field, value, onChange, onError) => watch(() => queryByChild(path, field, value), onChange, onError);
