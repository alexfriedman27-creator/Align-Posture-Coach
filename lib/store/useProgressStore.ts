import { create } from 'zustand';
import { UserProgress } from '../../types/UserProgress';
import { getProgress, upsertProgress } from '../db/queries';
import { syncProgress } from '../sync/supabaseSync';

interface ProgressStore {
  progress: UserProgress | null;
  isLoaded: boolean;
  loadProgress: () => Promise<void>;
  setProgress: (progress: UserProgress) => void;
  saveProgress: (progress: UserProgress) => Promise<void>;
}

const DEFAULT_PROGRESS: UserProgress = {
  id: 'progress_1',
  totalXP: 0,
  level: 1,
  streakDays: 0,
  longestStreak: 0,
  totalSessions: 0,
  totalMinutes: 0,
  lastSessionDate: null,
  thirtyDaySessionDates: [],
};

export const useProgressStore = create<ProgressStore>((set) => ({
  progress: null,
  isLoaded: false,

  loadProgress: async () => {
    const progress = await getProgress();
    set({ progress: progress ?? DEFAULT_PROGRESS, isLoaded: true });
  },

  setProgress: (progress) => set({ progress }),

  saveProgress: async (progress) => {
    await upsertProgress(progress);
    set({ progress });
    syncProgress(progress);
  },
}));
