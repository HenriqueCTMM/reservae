import { request } from './api-service.js';

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
