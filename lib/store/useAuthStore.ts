import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { ensureDeviceAuth } from '../auth/deviceAuth';
import { pushAllToSupabase, pullFromSupabase } from '../sync/supabaseSync';

interface AuthStore {
  session: Session | null;
  user: User | null;
  isAuthLoaded: boolean;
  // Returns true when a reinstall was detected and local stores need reloading.
  initAuth: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  isAuthLoaded: false,

  initAuth: async () => {
    const outcome = await ensureDeviceAuth();

    if (outcome.kind === 'error') {
      // Auth failed — app still works fully offline with local SQLite.
      set({ isAuthLoaded: true });
      return false;
    }

    set({ session: outcome.session, user: outcome.session.user, isAuthLoaded: true });

    // Keep the in-memory session current for the app's lifetime.
    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
    });

    if (outcome.kind === 'signed_up') {
      // First install — push any locally accumulated data to the new cloud account.
      void pushAllToSupabase(outcome.userId);
      return false;
    }

    if (outcome.kind === 'signed_in') {
      // Reinstall detected: AsyncStorage was wiped but SecureStore UUID survived.
      // Pull cloud data back into the fresh local SQLite.
      await pullFromSupabase(outcome.userId);
      return true; // caller must reload stores after this
    }

    return false;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
