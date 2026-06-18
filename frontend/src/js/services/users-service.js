import { getById, getCollection } from './api-service.js';

export const getUsers = () => getCollection('users');
export const getUserProfile = (uid) => getById('users', uid);
export const isAdminProfile = (profile) => profile?.perfil === 'admin';
