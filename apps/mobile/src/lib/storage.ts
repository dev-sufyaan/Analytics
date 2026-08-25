// apps/mobile/src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const CACHE_KEY = 'ANALYTICS_QUERY_OFFLINE_CACHE';
export const CACHE_BUSTER = 'v1.0.0';
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  throttleTime: 1000,
});

/**
 * Clears all persisted React Query cache entries from AsyncStorage.
 */
export async function clearPersistedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.error('Failed to clear persisted query cache:', err);
  }
}
