// 100 levels — gaps grow slowly (200 XP to reach L2, ~2800 XP per level at L100)
export const XP_THRESHOLDS: number[] = Array.from({ length: 100 }, (_, i) =>
  i === 0 ? 0 : Math.round(200 * Math.pow(i, 1.2))
);

export interface UserProgress {
  id: string;
  totalXP: number;
  level: number;
  streakDays: number;
  longestStreak: number;
  totalSessions: number;
  totalMinutes: number;
  lastSessionDate: string | null;
  thirtyDaySessionDates: string[];
}

export function xpForLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level - 1, XP_THRESHOLDS.length - 1)] ?? 0;
}

export function xpForNextLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
}

export function xpProgress(progress: UserProgress): number {
  const current = xpForLevel(progress.level);
  const next = xpForNextLevel(progress.level);
  if (next === current) return 1;
  return Math.min((progress.totalXP - current) / (next - current), 1);
}

export function xpToNextLevel(progress: UserProgress): number {
  return Math.max(0, xpForNextLevel(progress.level) - progress.totalXP);
}

export function levelFromXP(totalXP: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (totalXP >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, XP_THRESHOLDS.length);
}
