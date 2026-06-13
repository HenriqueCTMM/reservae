import { seedDefaultTables } from './tables-service.js';

export async function seedInitialDatabase() {
    const tables = await seedDefaultTables();

    return {
        tables
    };
}
