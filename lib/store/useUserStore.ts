import { create } from 'zustand';
import { UserProfile, UserGoal } from '../../types/UserProfile';
import { getProfile, upsertProfile, resetAllData } from '../db/queries';
import { syncProfile } from '../sync/supabaseSync';
import { refreshNotifications } from '../notifications/refresh';

interface UserStore {
  profile: UserProfile | null;
  isLoaded: boolean;
  isNew: boolean;
  devFastMode: boolean;
  setDevFastMode: (v: boolean) => void;
  loadProfile: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  updateName: (name: string) => void;
  updateGoal: (goal: UserGoal) => void;
  updateReminder: (hour: number, minute: number) => void;
  updatePro: (isPro: boolean) => void;
  completeOnboarding: () => Promise<void>;
  setReminderSet: (hour: number, minute: number) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  clearIsNew: () => void;
  resetAll: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'profile_1',
  name: '',
  username: '',
  goal: 'fixPosture',
  reminderHour: 8,
  reminderMinute: 0,
  onboardingCompleted: false,
  isPro: false,
  reminderSet: false,
  notificationsEnabled: true,
};

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  isLoaded: false,
  isNew: false,
  devFastMode: false,
  setDevFastMode: (v) => set({ devFastMode: v }),

  loadProfile: async () => {
    const saved = await getProfile();
    set({
      profile: saved ?? { ...DEFAULT_PROFILE },
      isLoaded: true,
      isNew: saved === null,
    });
  },

  saveProfile: async (profile) => {
    await upsertProfile(profile);
    set({ profile });
    syncProfile(profile);
    refreshNotifications();
  },

  updateName: (name) => {
    const p = get().profile;
    if (p) set({ profile: { ...p, name } });
  },

  updateGoal: (goal) => {
    const p = get().profile;
    if (p) set({ profile: { ...p, goal } });
  },

  updateReminder: (hour, minute) => {
    const p = get().profile;
    if (p) set({ profile: { ...p, reminderHour: hour, reminderMinute: minute } });
  },

  updatePro: (isPro) => {
    const p = get().profile;
    if (p) set({ profile: { ...p, isPro } });
  },

  completeOnboarding: async () => {
    const p = get().profile;
    if (!p) return;
    const updated = { ...p, onboardingCompleted: true };
    await upsertProfile(updated);
    set({ profile: updated });
    syncProfile(updated);
  },

  setReminderSet: async (hour, minute) => {
    const p = get().profile;
    if (!p) return;
    const updated = { ...p, reminderHour: hour, reminderMinute: minute, reminderSet: true };
    await upsertProfile(updated);
    set({ profile: updated });
    syncProfile(updated);
    refreshNotifications();
  },

  setNotificationsEnabled: async (enabled) => {
    const p = get().profile;
    if (!p) return;
    const updated = { ...p, notificationsEnabled: enabled };
    await upsertProfile(updated);
    set({ profile: updated });
    syncProfile(updated);
    refreshNotifications();
  },

  clearIsNew: () => set({ isNew: false }),

  resetAll: async () => {
    await resetAllData();
    set({ profile: { ...DEFAULT_PROFILE }, isLoaded: true, isNew: true });
  },
}));
