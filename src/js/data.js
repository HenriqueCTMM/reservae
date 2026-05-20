import { STORAGE_KEYS, getStorageData, setStorageData } from './storage.js';

const defaultUsers = [
    {
        id: 1,
        nome: 'Administrador',
        email: 'admin@restaurante.com',
        senha: '123456',
        perfil: 'admin'
    },
    {
        id: 2,
        nome: 'Cliente Teste',
        email: 'cliente@restaurante.com',
        senha: '123456',
        perfil: 'cliente'
    }
];

const defaultTables = [
    {
        id: 1,
        numero: 1,
        capacidade: 2,
        status: 'disponivel',
        posicaoX: 40,
        posicaoY: 40
    },
    {
        id: 2,
        numero: 2,
        capacidade: 4,
        status: 'disponivel',
        posicaoX: 220,
        posicaoY: 40
    },
    {
        id: 3,
        numero: 3,
        capacidade: 4,
        status: 'disponivel',
        posicaoX: 420,
        posicaoY: 40
    },
    {
        id: 4,
        numero: 4,
        capacidade: 6,
        status: 'disponivel',
        posicaoX: 120,
        posicaoY: 210
    },
    {
        id: 5,
        numero: 5,
        capacidade: 8,
        status: 'indisponivel',
        posicaoX: 360,
        posicaoY: 220
    }
];

const defaultReservations = [];

export function seedInitialData() {
    const users = getStorageData(STORAGE_KEYS.users, []);
    const tables = getStorageData(STORAGE_KEYS.tables, []);
    const reservations = getStorageData(STORAGE_KEYS.reservations, []);

    if (!users.length) {
        setStorageData(STORAGE_KEYS.users, defaultUsers);
    }

    if (!tables.length) {
        setStorageData(STORAGE_KEYS.tables, defaultTables);
    }

    if (!reservations.length) {
        setStorageData(STORAGE_KEYS.reservations, defaultReservations);
    }
}

export function getUsers() {
    return getStorageData(STORAGE_KEYS.users, []);
}

export function getTables() {
    return getStorageData(STORAGE_KEYS.tables, []);
}

export function saveTables(tables) {
    setStorageData(STORAGE_KEYS.tables, tables);
}

export function getReservations() {
    return getStorageData(STORAGE_KEYS.reservations, []);
}

export function saveReservations(reservations) {
    setStorageData(STORAGE_KEYS.reservations, reservations);
}