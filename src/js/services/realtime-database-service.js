import {
    equalTo,
    get,
    orderByChild,
    push,
    query,
    ref,
    remove,
    set,
    update
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { database } from '../firebaseConfig.js';

export function createTimestamp() {
    return Date.now();
}

export function snapshotToArray(snapshot) {
    const data = snapshot.val();

    if (!data) {
        return [];
    }

    return Object.entries(data).map(([id, value]) => ({
        id,
        ...value
    }));
}

function removeUndefinedFields(data) {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );
}

export async function getCollection(path) {
    const snapshot = await get(ref(database, path));
    return snapshotToArray(snapshot);
}

export async function getById(path, id) {
    const snapshot = await get(ref(database, `${path}/${id}`));
    const value = snapshot.val();

    if (!value) {
        return null;
    }

    return {
        id,
        ...value
    };
}

export async function createWithPush(path, data) {
    const newRef = push(ref(database, path));
    const id = newRef.key;
    const payload = removeUndefinedFields({
        id,
        ...data,
        createdAt: data.createdAt || createTimestamp()
    });

    await set(newRef, payload);
    return payload;
}

export async function setById(path, id, data) {
    const payload = removeUndefinedFields({
        id,
        ...data
    });

    await set(ref(database, `${path}/${id}`), payload);
    return payload;
}

export async function updateById(path, id, data) {
    const payload = removeUndefinedFields({
        ...data,
        updatedAt: data.updatedAt || createTimestamp()
    });

    await update(ref(database, `${path}/${id}`), payload);
    return getById(path, id);
}

export async function removeById(path, id) {
    await remove(ref(database, `${path}/${id}`));
}

export async function queryByChild(path, childPath, value) {
    const childQuery = query(ref(database, path), orderByChild(childPath), equalTo(value));
    const snapshot = await get(childQuery);
    return snapshotToArray(snapshot);
}
