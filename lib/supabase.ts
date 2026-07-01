import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast on a misconfigured build rather than constructing a broken client
// that produces cryptic runtime errors later.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config: set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
  );
}

// Session tokens (incl. the long-lived refresh token) are stored in the
// Keychain / Keystore via expo-secure-store, not plaintext AsyncStorage.
// SecureStore caps each entry at ~2 KB, and a Supabase session can exceed
// that, so values are transparently chunked across multiple keys.
const CHUNK_SIZE = 1800;

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const countRaw = await SecureStore.getItemAsync(`${key}__n`);
    if (countRaw == null) return null;
    const count = parseInt(countRaw, 10);
    let value = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}__${i}`);
      if (part == null) return null; // corrupt/partial write — treat as absent
      value += part;
    }
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    const count = Math.ceil(value.length / CHUNK_SIZE) || 1;
    // Remove any stale chunks left over from a previous, longer value.
    const prevRaw = await SecureStore.getItemAsync(`${key}__n`);
    const prevCount = prevRaw ? parseInt(prevRaw, 10) : 0;
    for (let i = count; i < prevCount; i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`);
    }
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}__${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}__n`, String(count));
  },

  async removeItem(key: string): Promise<void> {
    const countRaw = await SecureStore.getItemAsync(`${key}__n`);
    const count = countRaw ? parseInt(countRaw, 10) : 0;
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}__n`);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
