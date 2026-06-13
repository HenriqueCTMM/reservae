import {
    createTimestamp,
    getById,
    getCollection,
    setById,
    updateById
} from './realtime-database-service.js';

const USERS_PATH = 'users';
const ADMIN_EMAIL = 'henriquemamprim.m@gmail.com';

export async function getUsers() {
    return getCollection(USERS_PATH);
}

export async function getUserProfile(uid) {
    return getById(USERS_PATH, uid);
}

export async function saveUserProfile(user) {
    const perfil = user.perfil || 'cliente';

    return setById(USERS_PATH, user.uid, {
        uid: user.uid,
        nome: user.nome || user.displayName || user.email,
        email: user.email,
        perfil,
        createdAt: user.createdAt || createTimestamp(),
        updatedAt: createTimestamp()
    });
}

export async function saveAdminProfile(firebaseUser) {
    if (firebaseUser.email !== ADMIN_EMAIL) {
        throw new Error(`Somente ${ADMIN_EMAIL} pode ser configurado como administrador inicial.`);
    }

    return saveUserProfile({
        uid: firebaseUser.uid,
        nome: firebaseUser.displayName || firebaseUser.email,
        email: firebaseUser.email,
        perfil: 'admin'
    });
}

export async function ensureClientProfile(firebaseUser) {
    const existingProfile = await getUserProfile(firebaseUser.uid);

    if (existingProfile) {
        return existingProfile;
    }

    return saveUserProfile({
        uid: firebaseUser.uid,
        nome: firebaseUser.displayName || firebaseUser.email,
        email: firebaseUser.email,
        perfil: 'cliente'
    });
}

export async function updateUserProfile(uid, data) {
    return updateById(USERS_PATH, uid, data);
}

export function isAdminProfile(profile) {
    return profile?.perfil === 'admin';
}

export { ADMIN_EMAIL, USERS_PATH };
