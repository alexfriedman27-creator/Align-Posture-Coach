import { supabase } from '../supabase';
import { useAuthStore } from '../store/useAuthStore';
import { UserProfile } from '../../types/UserProfile';
import { UserProgress } from '../../types/UserProgress';
import { DailyPlan } from '../../types/DailyPlan';
import { ModuleSession } from '../../types/ModuleSession';
import { Badge } from '../../types/Badge';
import { CustomExercise } from '../../types/CustomExercise';
import {
  getProfile, upsertProfile,
  getProgress, upsertProgress,
  getAllDailyPlans, upsertDailyPlan,
  getAllModuleSessions, insertModuleSession,
  getBadges, insertBadge,
  getCustomExercises, insertCustomExercise,
} from '../db/queries';

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

// ─── Full push: local SQLite → Supabase (called after sign-up) ───────────────

export async function pushAllToSupabase(userId: string): Promise<void> {
  await Promise.all([
    _pushProfile(userId),
    _pushProgress(userId),
    _pushDailyPlans(userId),
    _pushModuleSessions(userId),
    _pushBadges(userId),
    _pushCustomExercises(userId),
  ]);
}

async function _pushProfile(userId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;
  await supabase.from('user_profile').upsert({
    id: userId,
    name: profile.name,
    username: profile.username,
    goal: profile.goal,
    reminder_hour: profile.reminderHour,
    reminder_minute: profile.reminderMinute,
    onboarding_completed: profile.onboardingCompleted,
    // is_pro intentionally NOT synced: RevenueCat is the sole source of truth
    // for the Pro entitlement, re-checked on launch/foreground via
    // syncEntitlement(). Never let a client-writable cloud row unlock Pro.
    reminder_set: profile.reminderSet,
  });
}

async function _pushProgress(userId: string): Promise<void> {
  const progress = await getProgress();
  if (!progress) return;
  await supabase.from('user_progress').upsert({
    id: userId,
    total_xp: progress.totalXP,
    level: progress.level,
    streak_days: progress.streakDays,
    longest_streak: progress.longestStreak,
    total_sessions: progress.totalSessions,
    total_minutes: progress.totalMinutes,
    last_session_date: progress.lastSessionDate,
    thirty_day_dates: progress.thirtyDaySessionDates,
  });
}

async function _pushDailyPlans(userId: string): Promise<void> {
  const plans = await getAllDailyPlans();
  if (!plans.length) return;
  await supabase.from('daily_plans').upsert(
    plans.map((p) => ({
      id: p.id,
      user_id: userId,
      date: p.date,
      exercise_ids: p.exerciseIds,
      completed_at: p.completedAt,
      xp_earned: p.xpEarned,
    }))
  );
}

async function _pushModuleSessions(userId: string): Promise<void> {
  const sessions = await getAllModuleSessions();
  if (!sessions.length) return;
  await supabase.from('module_sessions').upsert(
    sessions.map((s) => ({
      id: s.id,
      user_id: userId,
      module_id: s.moduleId,
      date: s.date,
      completed_exercise_ids: s.completedExerciseIds,
      duration_seconds: s.durationSeconds,
      xp_earned: s.xpEarned,
    }))
  );
}

async function _pushBadges(userId: string): Promise<void> {
  const badges = await getBadges();
  if (!badges.length) return;
  await supabase.from('badges').upsert(
    badges.map((b) => ({
      id: b.id,
      user_id: userId,
      name: b.name,
      description: b.description,
      earned_date: b.earnedDate,
      icon_name: b.iconName,
      is_pinned: b.isPinned,
    })),
    { onConflict: 'id,user_id' }
  );
}

async function _pushCustomExercises(userId: string): Promise<void> {
  const exercises = await getCustomExercises();
  if (!exercises.length) return;
  await supabase.from('custom_exercises').upsert(
    exercises.map((e) => ({
      id: e.id,
      user_id: userId,
      name: e.name,
      description: e.description,
      photo_uri: e.photoUri,
      slot: e.slot,
      duration_seconds: e.durationSeconds,
      created_at: e.createdAt,
    }))
  );
}

// ─── Full pull: Supabase → local SQLite (called after sign-in) ───────────────

export async function pullFromSupabase(userId: string): Promise<void> {
  await Promise.all([
    _pullProfile(userId),
    _pullProgress(userId),
    _pullDailyPlans(userId),
    _pullModuleSessions(userId),
    _pullBadges(userId),
    _pullCustomExercises(userId),
  ]);
}

async function _pullProfile(userId: string): Promise<void> {
  const { data } = await supabase.from('user_profile').select('*').eq('id', userId).single();
  if (!data) return;
  await upsertProfile({
    id: 'profile_1',
    name: data.name,
    username: data.username,
    goal: data.goal,
    reminderHour: data.reminder_hour,
    reminderMinute: data.reminder_minute,
    onboardingCompleted: data.onboarding_completed,
    // Do not trust a cloud is_pro value: RevenueCat's syncEntitlement() on
    // launch is authoritative and will flip this to the correct value.
    isPro: false,
    reminderSet: data.reminder_set,
    notificationsEnabled: data.notifications_enabled ?? true,
  });
}

async function _pullProgress(userId: string): Promise<void> {
  const { data } = await supabase.from('user_progress').select('*').eq('id', userId).single();
  if (!data) return;
  await upsertProgress({
    id: 'progress_1',
    totalXP: data.total_xp,
    level: data.level,
    streakDays: data.streak_days,
    longestStreak: data.longest_streak,
    totalSessions: data.total_sessions,
    totalMinutes: data.total_minutes,
    lastSessionDate: data.last_session_date,
    thirtyDaySessionDates: data.thirty_day_dates,
  });
}

async function _pullDailyPlans(userId: string): Promise<void> {
  const { data } = await supabase.from('daily_plans').select('*').eq('user_id', userId);
  for (const row of data ?? []) {
    await upsertDailyPlan({
      id: row.id,
      date: row.date,
      exerciseIds: row.exercise_ids,
      completedAt: row.completed_at,
      xpEarned: row.xp_earned,
    });
  }
}

async function _pullModuleSessions(userId: string): Promise<void> {
  const { data } = await supabase.from('module_sessions').select('*').eq('user_id', userId);
  for (const row of data ?? []) {
    await insertModuleSession({
      id: row.id,
      moduleId: row.module_id,
      date: row.date,
      completedExerciseIds: row.completed_exercise_ids,
      durationSeconds: row.duration_seconds,
      xpEarned: row.xp_earned,
    }).catch(() => {
      // row already exists locally — skip
    });
  }
}

async function _pullBadges(userId: string): Promise<void> {
  const { data } = await supabase.from('badges').select('*').eq('user_id', userId);
  for (const row of data ?? []) {
    await insertBadge({
      id: row.id,
      name: row.name,
      description: row.description,
      earnedDate: row.earned_date,
      iconName: row.icon_name,
      isPinned: row.is_pinned,
    });
  }
}

async function _pullCustomExercises(userId: string): Promise<void> {
  const { data } = await supabase.from('custom_exercises').select('*').eq('user_id', userId);
  for (const row of data ?? []) {
    await insertCustomExercise({
      id: row.id,
      name: row.name,
      description: row.description,
      photoUri: row.photo_uri,
      slot: row.slot,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
    }).catch(() => {
      // row already exists locally — skip
    });
  }
}

// ─── Background write-through sync (fire-and-forget after each local write) ──

export function syncProfile(profile: UserProfile): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('user_profile').upsert({
    id: userId,
    name: profile.name,
    username: profile.username,
    goal: profile.goal,
    reminder_hour: profile.reminderHour,
    reminder_minute: profile.reminderMinute,
    onboarding_completed: profile.onboardingCompleted,
    // is_pro intentionally NOT synced (see _pushProfile) — RevenueCat only.
    reminder_set: profile.reminderSet,
  });
}

export function syncProgress(progress: UserProgress): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('user_progress').upsert({
    id: userId,
    total_xp: progress.totalXP,
    level: progress.level,
    streak_days: progress.streakDays,
    longest_streak: progress.longestStreak,
    total_sessions: progress.totalSessions,
    total_minutes: progress.totalMinutes,
    last_session_date: progress.lastSessionDate,
    thirty_day_dates: progress.thirtyDaySessionDates,
  });
}

export function syncDailyPlan(plan: DailyPlan): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('daily_plans').upsert({
    id: plan.id,
    user_id: userId,
    date: plan.date,
    exercise_ids: plan.exerciseIds,
    completed_at: plan.completedAt,
    xp_earned: plan.xpEarned,
  });
}

export function syncModuleSession(session: ModuleSession): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('module_sessions').upsert({
    id: session.id,
    user_id: userId,
    module_id: session.moduleId,
    date: session.date,
    completed_exercise_ids: session.completedExerciseIds,
    duration_seconds: session.durationSeconds,
    xp_earned: session.xpEarned,
  });
}

export function syncBadge(badge: Badge): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('badges').upsert(
    {
      id: badge.id,
      user_id: userId,
      name: badge.name,
      description: badge.description,
      earned_date: badge.earnedDate,
      icon_name: badge.iconName,
      is_pinned: badge.isPinned,
    },
    { onConflict: 'id,user_id' }
  );
}

export function syncBadgePinState(badgeId: string, isPinned: number): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase
    .from('badges')
    .update({ is_pinned: isPinned })
    .eq('id', badgeId)
    .eq('user_id', userId);
}

export function syncCustomExercise(exercise: CustomExercise): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('custom_exercises').upsert({
    id: exercise.id,
    user_id: userId,
    name: exercise.name,
    description: exercise.description,
    photo_uri: exercise.photoUri,
    slot: exercise.slot,
    duration_seconds: exercise.durationSeconds,
    created_at: exercise.createdAt,
  });
}

export function deleteCustomExerciseSync(id: string): void {
  const userId = getUserId();
  if (!userId) return;
  void supabase.from('custom_exercises').delete().eq('id', id).eq('user_id', userId);
}

// ─── Account deletion: remove every remote row this user owns ─────────────────
// RLS permits a user to delete only their own rows. Awaited (not fire-and-forget)
// so the caller can guarantee the cloud copy is gone before wiping local state.
const REMOTE_TABLES = [
  'user_profile', 'user_progress', 'daily_plans',
  'module_sessions', 'badges', 'custom_exercises',
] as const;

export async function deleteAllRemoteData(): Promise<void> {
  const userId = getUserId();
  if (!userId) return;
  await Promise.all(
    REMOTE_TABLES.map((table) =>
      supabase.from(table).delete().eq('user_id', userId)
    )
  );
}
