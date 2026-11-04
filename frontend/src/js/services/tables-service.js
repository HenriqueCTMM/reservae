import { DEFAULT_TABLES } from './default-data.js';
import { request, watch } from './api-service.js';

const TABLES_PATH = 'tables';

function tablePayload(table) {
    const data = {};
    for (const field of ['numero', 'capacidade', 'posicaoX', 'posicaoY', 'rotacao']) {
        if (table[field] !== undefined) data[field] = Number(table[field]);
    }
    if (table.status !== undefined) data.status = table.status;
    return data;
}

export async function getTables() {
    return request('/tables');
}

export function watchTables(onChange, onError) {
    return watch(getTables, onChange, onError);
}

export async function getTableById(tableId) {
    const tables = await getTables();
    return tables.find((table) => table.id === String(tableId)) || null;
}

export async function getTablesByStatus(status) {
    const tables = await getTables();
    return tables.filter((table) => table.status === status);
}

export async function getTableByNumber(numero) {
    const tables = await getTables();
    return tables.find((table) => table.numero === Number(numero)) || null;
}

export async function saveTable(table) {
    return request('/tables', {
        method: 'POST', body: JSON.stringify(tablePayload(table))
    });
}

export async function updateTable(tableId, data) {
    return request(`/tables/${encodeURIComponent(tableId)}`, {
        method: 'PATCH', body: JSON.stringify(tablePayload(data))
    });
}

export async function removeTable(tableId) {
    return request(`/tables/${encodeURIComponent(tableId)}`, { method: 'DELETE' });
}

export async function seedDefaultTables() {
    const existingTables = await getTables();

    if (existingTables.length) {
        return existingTables;
    }

    await Promise.all(DEFAULT_TABLES.map((table) => saveTable(table)));
    return getTables();
}

export { TABLES_PATH };
