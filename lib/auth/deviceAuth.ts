import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { supabase } from '../supabase';
import type { Session } from '@supabase/supabase-js';

const DEVICE_UUID_KEY = 'align_device_uuid';
const DEVICE_SECRET_KEY = 'align_device_secret';

// SecureStore persists through app reinstalls on iOS (stored in Keychain).
// This gives each device a stable identity that survives uninstall/reinstall.
//
// The account password is an independent, CSPRNG-generated secret — it is NOT
// derived from the UUID. Both the UUID and the secret live only in the Keychain
// and are never transmitted except over Supabase's authenticated TLS channel.

function randomHex(bytes: number): string {
  return Array.from(Crypto.getRandomBytes(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrCreateDeviceUUID(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DEVICE_UUID_KEY);
  if (stored) return stored;
  const uuid = Crypto.randomUUID(); // CSPRNG-backed v4 UUID
  await SecureStore.setItemAsync(DEVICE_UUID_KEY, uuid);
  return uuid;
}

function emailFor(uuid: string): string {
  return `${uuid}@device.align.app`;
}

// Legacy scheme: password was derived from the UUID. Kept ONLY so existing
// accounts can be authenticated once and immediately rotated to a strong
// independent secret (see rotation in ensureDeviceAuth). Do not use for new
// accounts.
function legacyPassword(uuid: string): string {
  return `${uuid}-d3v1c3`;
}

export type DeviceAuthOutcome =
  | { kind: 'session_restored'; userId: string; session: Session }
  | { kind: 'signed_in'; userId: string; session: Session }  // reinstall
  | { kind: 'signed_up'; userId: string; session: Session }  // first install
  | { kind: 'error'; message: string };

export async function ensureDeviceAuth(): Promise<DeviceAuthOutcome> {
  // Fast path: storage still has a valid session (not a reinstall).
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return { kind: 'session_restored', userId: session.user.id, session };
  }

  const uuid = await getOrCreateDeviceUUID();
  const email = emailFor(uuid);
  const storedSecret = await SecureStore.getItemAsync(DEVICE_SECRET_KEY);

  // Returning device with a strong secret already provisioned.
  if (storedSecret) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: storedSecret,
    });
    if (!error && data.user && data.session) {
      return { kind: 'signed_in', userId: data.user.id, session: data.session };
    }
    return { kind: 'error', message: error?.message ?? 'Device sign-in failed' };
  }

  // No secret stored yet: either a brand-new install or a legacy account whose
  // password was derived from the UUID. Provision a fresh independent secret.
  const newSecret = randomHex(32); // 256-bit password

  // First install — create the device account with the strong secret.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: newSecret,
  });
  if (!signUpError && signUpData.user && signUpData.session) {
    await SecureStore.setItemAsync(DEVICE_SECRET_KEY, newSecret);
    return { kind: 'signed_up', userId: signUpData.user.id, session: signUpData.session };
  }

  // Sign-up failed because the account already exists (legacy install).
  // Authenticate once with the old derived password, then rotate to the
  // strong secret so the weak password is retired.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: legacyPassword(uuid),
  });
  if (!signInError && signInData.user && signInData.session) {
    const { error: rotateError } = await supabase.auth.updateUser({ password: newSecret });
    if (!rotateError) {
      await SecureStore.setItemAsync(DEVICE_SECRET_KEY, newSecret);
    }
    return { kind: 'signed_in', userId: signInData.user.id, session: signInData.session };
  }

  return {
    kind: 'error',
    message: signUpError?.message ?? signInError?.message ?? 'Device auth failed',
  };
}
