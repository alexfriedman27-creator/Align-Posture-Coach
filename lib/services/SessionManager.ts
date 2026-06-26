import { Exercise } from '../../types/Exercise';
import { UserProgress, levelFromXP } from '../../types/UserProgress';
import { DailyPlan } from '../../types/DailyPlan';
import { ModuleSession } from '../../types/ModuleSession';
import { Badge, getBadgeDefinition } from '../../types/Badge';
import {
  upsertDailyPlan, upsertProgress, insertModuleSession,
  getBadges, insertBadge, autoEquipNewBadge, getModuleSessionCountForDate,
  getCompletedDailyPlanCount, getDistinctCompletedModuleIds,
  getDistinctModuleCountForDay, getAllUniqueExerciseIds,
  getCustomExerciseCount, getProgressPhotoCount, getWeekendSessionDayCount,
} from '../db/queries';
import { moduleRepository } from '../data/ModuleRepository';
import { exerciseRepository } from '../data/ExerciseRepository';
import { todayDateString } from './DailyPlanGenerator';
import { syncProgress, syncDailyPlan, syncModuleSession, syncBadge } from '../sync/supabaseSync';

export type SessionSource = { type: 'dailyPlan'; plan: DailyPlan } | { type: 'module'; moduleId: string };

async function computeXP(source: SessionSource, streakDays: number): Promise<number> {
  if (source.type === 'dailyPlan') {
    return 500 + streakDays * 50;
  }
  const today = todayDateString();
  const priorCount = await getModuleSessionCountForDate(source.moduleId, today);
  if (priorCount > 0) return 100;
  const mod = moduleRepository.module(source.moduleId);
  switch (mod?.intensity) {
    case 'easy': return 200;
    case 'hard': return 400;
    default: return 300;
  }
}

function updateStreak(progress: UserProgress, today: string): number {
  if (!progress.lastSessionDate) return 1;
  const last = new Date(progress.lastSessionDate);
  const now = new Date(today);
  const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return progress.streakDays + 1;
  if (diffDays === 0) return progress.streakDays;
  return 1;
}

function updateThirtyDayDates(existing: string[], today: string): string[] {
  const c = new Date();
  c.setDate(c.getDate() - 30);
  const cutoffStr = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
  const filtered = existing.filter((d) => d >= cutoffStr);
  if (!filtered.includes(today)) filtered.push(today);
  return filtered;
}

function daysBetween(dateA: string, dateB: string): number {
  const [ay, am, ad] = dateA.split('-').map(Number);
  const [by, bm, bd] = dateB.split('-').map(Number);
  const a = new Date(ay, am - 1, ad);
  const b = new Date(by, bm - 1, bd);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

async function checkAndAwardBadges(
  progress: UserProgress,
  prevLastSessionDate: string | null,
  durationSeconds: number,
  sessionHour: number,
): Promise<Badge[]> {
  const today = todayDateString();
  const existing = await getBadges();
  const existingIds = new Set(existing.map((b) => b.id));

  const [
    dailyPlanCount,
    distinctModuleIds,
    modulesForToday,
    uniqueExerciseIds,
    customExerciseCount,
    photoCount,
    weekendDayCount,
  ] = await Promise.all([
    getCompletedDailyPlanCount(),
    getDistinctCompletedModuleIds(),
    getDistinctModuleCountForDay(today),
    getAllUniqueExerciseIds(),
    getCustomExerciseCount(),
    getProgressPhotoCount(),
    getWeekendSessionDayCount(),
  ]);

  const toAward: string[] = [];

  function check(id: string, condition: boolean) {
    if (!existingIds.has(id) && condition) toAward.push(id);
  }

  // First session
  check('first_session', progress.totalSessions >= 1);

  // Streaks
  check('streak_3',   progress.streakDays >= 3);
  check('streak_7',   progress.streakDays >= 7);
  check('streak_14',  progress.streakDays >= 14);
  check('streak_30',  progress.streakDays >= 30);
  check('streak_60',  progress.streakDays >= 60);
  check('streak_90',  progress.streakDays >= 90);
  check('streak_100', progress.streakDays >= 100);
  check('streak_180', progress.streakDays >= 180);
  check('streak_365', progress.streakDays >= 365);

  // Total sessions
  check('sessions_10',   progress.totalSessions >= 10);
  check('sessions_25',   progress.totalSessions >= 25);
  check('sessions_50',   progress.totalSessions >= 50);
  check('sessions_100',  progress.totalSessions >= 100);
  check('sessions_250',  progress.totalSessions >= 250);
  check('sessions_500',  progress.totalSessions >= 500);
  check('sessions_1000', progress.totalSessions >= 1000);

  // Daily plan completions
  check('daily_10',  dailyPlanCount >= 10);
  check('daily_30',  dailyPlanCount >= 30);
  check('daily_100', dailyPlanCount >= 100);

  // Unique modules tried
  const distinctModuleCount = distinctModuleIds.size;
  check('modules_tried_2',  distinctModuleCount >= 2);
  check('modules_tried_3',  distinctModuleCount >= 3);
  check('modules_tried_5',  distinctModuleCount >= 5);
  check('modules_tried_10', distinctModuleCount >= 10);
  check('module_completionist', distinctModuleIds.size >= moduleRepository.allModules.length);

  // Same-day modules
  check('same_day_2',  modulesForToday >= 2);
  check('same_day_3',  modulesForToday >= 3);
  check('same_day_5',  modulesForToday >= 5);
  check('same_day_10', modulesForToday >= 10);

  // Exercise variety
  const builtInIds = new Set(exerciseRepository.allExercises.map((e) => e.id));
  const uniqueBuiltInCount = [...uniqueExerciseIds].filter((id) => builtInIds.has(id)).length;
  check('exercises_10',  uniqueExerciseIds.size >= 10);
  check('exercises_25',  uniqueExerciseIds.size >= 25);
  check('exercises_50',  uniqueExerciseIds.size >= 50);
  check('exercises_all', uniqueBuiltInCount >= builtInIds.size);

  // Time accumulated (minutes)
  check('time_10m',  progress.totalMinutes >= 10);
  check('time_1h',   progress.totalMinutes >= 60);
  check('time_10h',  progress.totalMinutes >= 600);
  check('time_50h',  progress.totalMinutes >= 3000);

  // Level milestones
  check('level_3',   progress.level >= 3);
  check('level_5',   progress.level >= 5);
  check('level_10',  progress.level >= 10);
  check('level_25',  progress.level >= 25);
  check('level_50',  progress.level >= 50);
  check('level_100', progress.level >= 100);

  // Custom exercises
  check('custom_ex_1',  customExerciseCount >= 1);
  check('custom_ex_5',  customExerciseCount >= 5);
  check('custom_ex_10', customExerciseCount >= 10);

  // Progress photos
  check('photo_1',  photoCount >= 1);
  check('photo_10', photoCount >= 10);

  // Time of day
  check('early_bird',      sessionHour < 7);
  check('night_owl',       sessionHour >= 22);
  check('weekend_warrior', weekendDayCount >= 10);

  // Comeback kid: previous session was 30+ days ago
  if (prevLastSessionDate) {
    check('comeback_kid', daysBetween(prevLastSessionDate, today) >= 30);
  }

  // Marathon session: 20+ minutes
  check('marathon_session', durationSeconds >= 20 * 60);

  // Award badges
  const newBadges: Badge[] = [];
  for (const id of toAward) {
    const def = getBadgeDefinition(id);
    if (!def) continue;
    const badge: Badge = {
      id: def.id,
      name: def.name,
      description: def.description,
      iconName: def.iconName,
      earnedDate: today,
      isPinned: 0,
    };
    await insertBadge(badge);
    await autoEquipNewBadge(badge.id);
    newBadges.push(badge);
  }

  return newBadges;
}

export async function checkAndAwardPhotoBadges(): Promise<Badge[]> {
  const existing = await getBadges();
  const existingIds = new Set(existing.map((b) => b.id));
  const photoCount = await getProgressPhotoCount();

  const toAward: string[] = [];
  if (!existingIds.has('photo_1')  && photoCount >= 1)  toAward.push('photo_1');
  if (!existingIds.has('photo_10') && photoCount >= 10) toAward.push('photo_10');

  const today = todayDateString();
  const newBadges: Badge[] = [];
  for (const id of toAward) {
    const def = getBadgeDefinition(id);
    if (!def) continue;
    const badge: Badge = { id: def.id, name: def.name, description: def.description, iconName: def.iconName, earnedDate: today, isPinned: 0 };
    await insertBadge(badge);
    await autoEquipNewBadge(badge.id);
    newBadges.push(badge);
  }
  for (const badge of newBadges) syncBadge(badge);
  return newBadges;
}

export async function persistSessionCompletion(
  source: SessionSource,
  exercises: Exercise[],
  durationSeconds: number,
  progress: UserProgress
): Promise<{ xpEarned: number; updatedProgress: UserProgress; newBadges: Badge[] }> {
  const today = todayDateString();
  const sessionHour = new Date().getHours();
  const prevLastSessionDate = progress.lastSessionDate;
  const newStreak = updateStreak(progress, today);
  const xpEarned = await computeXP(source, newStreak);

  const updatedProgress: UserProgress = {
    ...progress,
    totalXP: progress.totalXP + xpEarned,
    level: levelFromXP(progress.totalXP + xpEarned),
    streakDays: newStreak,
    longestStreak: Math.max(progress.longestStreak, newStreak),
    totalSessions: progress.totalSessions + 1,
    totalMinutes: progress.totalMinutes + Math.round(durationSeconds / 60),
    lastSessionDate: today,
    thirtyDaySessionDates: updateThirtyDayDates(progress.thirtyDaySessionDates, today),
  };

  await upsertProgress(updatedProgress);
  syncProgress(updatedProgress);

  if (source.type === 'dailyPlan') {
    const updatedPlan: DailyPlan = { ...source.plan, completedAt: new Date().toISOString(), xpEarned };
    await upsertDailyPlan(updatedPlan);
    syncDailyPlan(updatedPlan);
  } else {
    const session: ModuleSession = {
      id: `msession_${Date.now()}`,
      moduleId: source.moduleId,
      date: today,
      completedExerciseIds: exercises.map((e) => e.id),
      durationSeconds,
      xpEarned,
    };
    await insertModuleSession(session);
    syncModuleSession(session);
  }

  const newBadges = await checkAndAwardBadges(updatedProgress, prevLastSessionDate, durationSeconds, sessionHour);
  for (const badge of newBadges) syncBadge(badge);

  return { xpEarned, updatedProgress, newBadges };
}
