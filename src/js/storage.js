export const STORAGE_KEYS = {
  users: 'restaurant_users',
  currentUser: 'restaurant_current_user',
  tables: 'restaurant_tables',
  reservations: 'restaurant_reservations'
};

export function getStorageData(key, fallback = []) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

export function setStorageData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}