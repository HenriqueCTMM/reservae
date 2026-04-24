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

export function seedInitialData() {
  const users = getStorageData(STORAGE_KEYS.users, []);

  if (!users.length) {
    setStorageData(STORAGE_KEYS.users, defaultUsers);
  }

}

export function getUsers() {
  return getStorageData(STORAGE_KEYS.users, []);
}
