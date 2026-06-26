import { create } from 'zustand';
import { DailyPlan } from '../../types/DailyPlan';
import { generateOrGetDailyPlan, todayDateString } from '../services/DailyPlanGenerator';
import { upsertDailyPlan } from '../db/queries';

interface PlanStore {
  plan: DailyPlan | null;
  isLoaded: boolean;
  loadOrGeneratePlan: () => Promise<void>;
  markCompleted: (xpEarned: number) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plan: null,
  isLoaded: false,

  loadOrGeneratePlan: async () => {
    const today = todayDateString();
    const plan = await generateOrGetDailyPlan(today);
    set({ plan, isLoaded: true });
  },

  markCompleted: async (xpEarned) => {
    const plan = get().plan;
    if (!plan) return;
    const updated: DailyPlan = {
      ...plan,
      completedAt: new Date().toISOString(),
      xpEarned,
    };
    await upsertDailyPlan(updated);
    set({ plan: updated });
  },
}));
