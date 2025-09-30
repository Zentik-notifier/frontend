import { Platform } from 'react-native';
import BaseAsyncStorage from 'expo-sqlite/kv-store';

export type KeyValuePair = [string, string];

const WebStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async getItem(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    const v = localStorage.getItem(key);
    return v === null ? null : v;
  },
  async removeItem(key: string): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
  async clear(): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  },
  async getAllKeys(): Promise<string[]> {
    if (typeof localStorage === 'undefined') return [];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  },
  async multiSet(entries: KeyValuePair[]): Promise<void> {
    for (const [k, v] of entries) {
      await WebStorage.setItem(k, v);
    }
  },
  async multiRemove(keys: string[]): Promise<void> {
    for (const k of keys) {
      await WebStorage.removeItem(k);
    }
  },
};

const NativeStorage = {
  setItem(key: string, value: string): Promise<void> {
    return BaseAsyncStorage.setItem(key, value);
  },
  getItem(key: string): Promise<string | null> {
    return BaseAsyncStorage.getItem(key);
  },
  removeItem(key: string): Promise<void> {
    return BaseAsyncStorage.removeItem(key);
  },
  async clear(): Promise<void> {
    if (typeof (BaseAsyncStorage as any).clear === 'function') {
      return (BaseAsyncStorage as any).clear();
    }
    const keys = await NativeStorage.getAllKeys();
    await NativeStorage.multiRemove(keys);
  },
  async getAllKeys(): Promise<string[]> {
    if (typeof (BaseAsyncStorage as any).getAllKeys === 'function') {
      return (BaseAsyncStorage as any).getAllKeys();
    }
    return [];
  },
  async multiSet(entries: KeyValuePair[]): Promise<void> {
    if (typeof (BaseAsyncStorage as any).multiSet === 'function') {
      return (BaseAsyncStorage as any).multiSet(entries);
    }
    for (const [k, v] of entries) {
      await BaseAsyncStorage.setItem(k, v);
    }
  },
  async multiRemove(keys: string[]): Promise<void> {
    if (typeof (BaseAsyncStorage as any).multiRemove === 'function') {
      return (BaseAsyncStorage as any).multiRemove(keys);
    }
    for (const k of keys) {
      await BaseAsyncStorage.removeItem(k);
    }
  },
};

const AsyncStorage = Platform.OS === 'web' ? WebStorage : NativeStorage;
export default AsyncStorage;
