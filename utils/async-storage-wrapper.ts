import { NativeModules, Platform } from 'react-native';
import BaseAsyncStorage from 'expo-sqlite/kv-store';
import * as Device from 'expo-device';
import * as Keychain from 'react-native-keychain';
import { openWebStorageDb } from '../services/db-setup';

export type KeyValuePair = [string, string];
type StorageOptions = { secret?: boolean };

const { DatabaseAccessBridge } = NativeModules;
const useBridgeKV = (Platform.OS === 'ios' || Platform.OS === 'macos') && DatabaseAccessBridge;

const bundleIdentifier = process.env.EXPO_PUBLIC_APP_VARIANT === 'development'
  ? 'com.apocaliss92.zentik.dev'
  : 'com.apocaliss92.zentik';
const KEYCHAIN_ACCESS_GROUP = `C3F24V5NS5.${bundleIdentifier}.keychain`;
const ACCESSIBLE = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK;

function getKeychainServiceForKey(key: string): string {
  return `zentik-kv:${key}`;
}

class WebStorageIndexedDB {

  async setItem(key: string, value: string, _options?: StorageOptions): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const db = await openWebStorageDb();
    await db.put('keyvalue', value, key);
  }

  async getItem(key: string, _options?: StorageOptions): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const db = await openWebStorageDb();
      const result = await db.get('keyvalue', key);
      return result || null;
    } catch {
      return null;
    }
  }

  async removeItem(key: string, _options?: StorageOptions): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const db = await openWebStorageDb();
      await db.delete('keyvalue', key);
    } catch {
      // Ignore errors
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const db = await openWebStorageDb();
      await db.clear('keyvalue');
    } catch {
      // Ignore errors
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const db = await openWebStorageDb();
      const allKeys = await db.getAllKeys('keyvalue');
      return allKeys;
    } catch {
      return [];
    }
  }

  async multiSet(entries: KeyValuePair[], _options?: StorageOptions): Promise<void> {
    const db = await openWebStorageDb();
    const tx = db.transaction('keyvalue', 'readwrite');
    
    for (const [key, value] of entries) {
      await tx.store.put(value, key);
    }
    
    await tx.done;
  }

  async multiRemove(keys: string[], _options?: StorageOptions): Promise<void> {
    const db = await openWebStorageDb();
    const tx = db.transaction('keyvalue', 'readwrite');
    
    for (const key of keys) {
      await tx.store.delete(key);
    }
    
    await tx.done;
  }
}

const WebStorage = new WebStorageIndexedDB();

const bridgeKV = useBridgeKV
  ? {
      async setItem(key: string, value: string): Promise<void> {
        await DatabaseAccessBridge.setSettingValue(key, value);
      },
      async getItem(key: string): Promise<string | null> {
        const res = await DatabaseAccessBridge.getSettingValue(key);
        const v = res?.value;
        return v != null ? String(v) : null;
      },
      async removeItem(key: string): Promise<void> {
        await DatabaseAccessBridge.removeSettingValue(key);
      },
      async getAllKeys(): Promise<string[]> {
        const res = await DatabaseAccessBridge.getAllSettingKeys();
        return Array.isArray(res?.keys) ? res.keys : [];
      },
    }
  : null;

const NativeStorage = {
  async setItem(key: string, value: string, options?: StorageOptions): Promise<void> {
    if ((Platform.OS === 'ios' || Platform.OS === 'macos') && options?.secret) {
      const service = getKeychainServiceForKey(key);
      const setOptions: Keychain.SetOptions = Device.isDevice
        ? { service, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
        : { service, accessible: ACCESSIBLE };
      await Keychain.setGenericPassword(key, value, setOptions);
      return;
    }
    if (bridgeKV) return bridgeKV.setItem(key, value);
    return BaseAsyncStorage.setItem(key, value);
  },
  async getItem(key: string, options?: StorageOptions): Promise<string | null> {
    if ((Platform.OS === 'ios' || Platform.OS === 'macos') && options?.secret) {
      try {
        const service = getKeychainServiceForKey(key);
        const getOptions: Keychain.GetOptions = Device.isDevice
          ? { service, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service };
        const creds = await Keychain.getGenericPassword(getOptions);
        return creds ? creds.password : null;
      } catch {
        return null;
      }
    }
    if (bridgeKV) return bridgeKV.getItem(key);
    return BaseAsyncStorage.getItem(key);
  },
  async removeItem(key: string, options?: StorageOptions): Promise<void> {
    if ((Platform.OS === 'ios' || Platform.OS === 'macos') && options?.secret) {
      try {
        const service = getKeychainServiceForKey(key);
        const setOptions: Keychain.SetOptions = Device.isDevice
          ? { service, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service };
        await Keychain.resetGenericPassword(setOptions);
      } catch { }
      return;
    }
    if (bridgeKV) return bridgeKV.removeItem(key);
    return BaseAsyncStorage.removeItem(key);
  },
  async clear(): Promise<void> {
    if (bridgeKV) {
      const keys = await bridgeKV.getAllKeys();
      for (const k of keys) await bridgeKV.removeItem(k);
      return;
    }
    if (typeof (BaseAsyncStorage as any).clear === 'function') {
      return (BaseAsyncStorage as any).clear();
    }
    const keys = await NativeStorage.getAllKeys();
    await NativeStorage.multiRemove(keys);
  },
  async getAllKeys(): Promise<string[]> {
    if (bridgeKV) return bridgeKV.getAllKeys();
    if (typeof (BaseAsyncStorage as any).getAllKeys === 'function') {
      return (BaseAsyncStorage as any).getAllKeys();
    }
    return [];
  },
  async multiSet(entries: KeyValuePair[], options?: StorageOptions): Promise<void> {
    if ((Platform.OS === 'ios' || Platform.OS === 'macos') && options?.secret) {
      for (const [k, v] of entries) {
        await NativeStorage.setItem(k, v, options);
      }
      return;
    }
    if (bridgeKV) {
      for (const [k, v] of entries) await bridgeKV.setItem(k, v);
      return;
    }
    if (typeof (BaseAsyncStorage as any).multiSet === 'function') {
      return (BaseAsyncStorage as any).multiSet(entries);
    }
    for (const [k, v] of entries) await BaseAsyncStorage.setItem(k, v);
  },
  async multiRemove(keys: string[], options?: StorageOptions): Promise<void> {
    if ((Platform.OS === 'ios' || Platform.OS === 'macos') && options?.secret) {
      for (const k of keys) await NativeStorage.removeItem(k, options);
      return;
    }
    if (bridgeKV) {
      for (const k of keys) await bridgeKV.removeItem(k);
      return;
    }
    if (typeof (BaseAsyncStorage as any).multiRemove === 'function') {
      return (BaseAsyncStorage as any).multiRemove(keys);
    }
    for (const k of keys) await BaseAsyncStorage.removeItem(k);
  },
};

const AsyncStorage = Platform.OS === 'web' ? WebStorage : NativeStorage;
export default AsyncStorage;
