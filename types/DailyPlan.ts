export interface DailyPlan {
  id: string;
  date: string;
  exerciseIds: string[];
  completedAt: string | null;
  xpEarned: number;
}
