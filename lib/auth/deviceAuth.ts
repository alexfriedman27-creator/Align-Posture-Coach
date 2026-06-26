import * as SecureStore from 'expo-secure-store';
import { supabase } from '../supabase';
import type { Session } from '@supabase/supabase-js';

const DEVICE_UUID_KEY = 'align_device_uuid';

// SecureStore persists through app reinstalls on iOS (stored in Keychain).
// This gives each device a stable identity that survives uninstall/reinstall.

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deriveCredentials(uuid: string) {
  return {
    email: `${uuid}@device.align.app`,
    password: `${uuid}-d3v1c3`,
  };
}

async function getOrCreateDeviceUUID(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DEVICE_UUID_KEY);
  if (stored) return stored;
  const uuid = generateUUID();
  await SecureStore.setItemAsync(DEVICE_UUID_KEY, uuid);
  return uuid;
}

export type DeviceAuthOutcome =
  | { kind: 'session_restored'; userId: string; session: Session }
  | { kind: 'signed_in'; userId: string; session: Session }  // reinstall
  | { kind: 'signed_up'; userId: string; session: Session }  // first install
  | { kind: 'error'; message: string };

export async function ensureDeviceAuth(): Promise<DeviceAuthOutcome> {
  // Fast path: AsyncStorage still has a valid session (not a reinstall).
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return { kind: 'session_restored', userId: session.user.id, session };
  }

  const uuid = await getOrCreateDeviceUUID();
  const { email, password } = deriveCredentials(uuid);

  // Try signing in — succeeds on reinstall (SecureStore UUID still valid,
  // Supabase account still exists, but AsyncStorage session was wiped).
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError && signInData.user && signInData.session) {
    return { kind: 'signed_in', userId: signInData.user.id, session: signInData.session };
  }

  // First install — create the device account.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (!signUpError && signUpData.user && signUpData.session) {
    return { kind: 'signed_up', userId: signUpData.user.id, session: signUpData.session };
  }

  return {
    kind: 'error',
    message: signUpError?.message ?? signInError?.message ?? 'Device auth failed',
  };
}
