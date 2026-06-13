import { DEFAULT_TABLES } from './default-data.js';
import {
    createTimestamp,
    getById,
    getCollection,
    queryByChild,
    removeById,
    setById,
    updateById
} from './realtime-database-service.js';

const TABLES_PATH = 'tables';

export async function getTables() {
    const tables = await getCollection(TABLES_PATH);
    return tables.sort((a, b) => a.numero - b.numero);
}

export async function getTableById(tableId) {
    return getById(TABLES_PATH, tableId);
}

export async function getTablesByStatus(status) {
    return queryByChild(TABLES_PATH, 'status', status);
}

export async function getTableByNumber(numero) {
    const tables = await queryByChild(TABLES_PATH, 'numero', Number(numero));
    return tables[0] || null;
}

export async function saveTable(table) {
    const id = table.id || `mesa-${table.numero}`;

    return setById(TABLES_PATH, id, {
        numero: Number(table.numero),
        capacidade: Number(table.capacidade),
        status: table.status,
        posicaoX: Number(table.posicaoX),
        posicaoY: Number(table.posicaoY),
        createdAt: table.createdAt || createTimestamp(),
        updatedAt: createTimestamp()
    });
}

export async function updateTable(tableId, data) {
    return updateById(TABLES_PATH, tableId, {
        ...data,
        numero: data.numero ? Number(data.numero) : data.numero,
        capacidade: data.capacidade ? Number(data.capacidade) : data.capacidade,
        posicaoX: data.posicaoX ? Number(data.posicaoX) : data.posicaoX,
        posicaoY: data.posicaoY ? Number(data.posicaoY) : data.posicaoY
    });
}

export async function removeTable(tableId) {
    return removeById(TABLES_PATH, tableId);
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
