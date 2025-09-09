import AsyncStorageFrom from '@react-native-async-storage/async-storage';
import AsyncStorageTo from 'expo-sqlite/kv-store';

/**
 * Migration service to transfer data from AsyncStorage to expo-sqlite kv-store
 */
export class StorageMigrationService {
    private static readonly MIGRATION_KEY = '@zentik/migration_completed';

    /**
     * Migrate all data from AsyncStorage to kv-store
     */
    static async migrateFromAsyncStorage(): Promise<void> {
        // Check if migration is already completed
        const isMigratedKey = await AsyncStorageTo.getItem(this.MIGRATION_KEY);
        if (isMigratedKey && isMigratedKey === 'true') {
            console.log('📦 Migration already completed, skipping...');
            return;
        }

        console.log('🚀 Starting migration from AsyncStorage to kv-store...');

        try {
            const allKeys = await AsyncStorageFrom.getAllKeys();

            console.log(`📦 Found ${allKeys.join(', ')} keys to migrate`);

            for (const key of allKeys) {
                // const toKeyExists = await AsyncStorageTo.getItem(key);
                // if (toKeyExists) {
                //     continue;
                // }
                const value = await AsyncStorageFrom.getItem(key);
                if (value) {
                    await AsyncStorageTo.setItem(key, value);
                }
            }

            await AsyncStorageTo.setItem(this.MIGRATION_KEY, 'true');

            console.log(`📊 Migrated ${allKeys.length} items from AsyncStorage to kv-store`);
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
}
