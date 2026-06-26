import { getDb } from './schema';
import { UserProfile } from '../../types/UserProfile';
import { UserProgress, levelFromXP } from '../../types/UserProgress';
import { DailyPlan } from '../../types/DailyPlan';
import { ModuleSession } from '../../types/ModuleSession';
import { ProgressPhoto } from '../../types/ProgressPhoto';
import { Badge } from '../../types/Badge';
import { CustomExercise } from '../../types/CustomExercise';
import { ExerciseSlot } from '../../types/Exercise';

// --- UserProfile ---

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1');
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    goal: row.goal,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    onboardingCompleted: row.onboarding_completed === 1,
    isPro: row.is_pro === 1,
    reminderSet: row.reminder_set === 1,
  };
}

export async function upsertProfile(p: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profile
     (id, name, username, goal, reminder_hour, reminder_minute, onboarding_completed, is_pro, reminder_set)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    p.id, p.name, p.username, p.goal,
    p.reminderHour, p.reminderMinute,
    p.onboardingCompleted ? 1 : 0,
    p.isPro ? 1 : 0,
    p.reminderSet ? 1 : 0
  );
}

// --- UserProgress ---

export async function getProgress(): Promise<UserProgress | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_progress LIMIT 1');
  if (!row) return null;
  return {
    id: row.id,
    totalXP: row.total_xp,
    level: row.level,
    streakDays: row.streak_days,
    longestStreak: row.longest_streak,
    totalSessions: row.total_sessions,
    totalMinutes: row.total_minutes,
    lastSessionDate: row.last_session_date,
    thirtyDaySessionDates: JSON.parse(row.thirty_day_dates),
  };
}

export async function upsertProgress(p: UserProgress): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_progress
     (id, total_xp, level, streak_days, longest_streak, total_sessions, total_minutes, last_session_date, thirty_day_dates)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    p.id, p.totalXP, p.level, p.streakDays, p.longestStreak,
    p.totalSessions, p.totalMinutes, p.lastSessionDate,
    JSON.stringify(p.thirtyDaySessionDates)
  );
}

// --- DailyPlan ---

export async function getDailyPlan(date: string): Promise<DailyPlan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM daily_plans WHERE date = ?', date);
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    exerciseIds: JSON.parse(row.exercise_ids),
    completedAt: row.completed_at,
    xpEarned: row.xp_earned,
  };
}

export async function upsertDailyPlan(plan: DailyPlan): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO daily_plans (id, date, exercise_ids, completed_at, xp_earned)
     VALUES (?, ?, ?, ?, ?)`,
    plan.id, plan.date, JSON.stringify(plan.exerciseIds), plan.completedAt, plan.xpEarned
  );
}

export async function getRecentDailyPlans(days: number): Promise<DailyPlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM daily_plans ORDER BY date DESC LIMIT ?', days
  );
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    exerciseIds: JSON.parse(row.exercise_ids),
    completedAt: row.completed_at,
    xpEarned: row.xp_earned,
  }));
}

// --- ModuleSession ---

export async function insertModuleSession(session: ModuleSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO module_sessions (id, module_id, date, completed_exercise_ids, duration_seconds, xp_earned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    session.id, session.moduleId, session.date,
    JSON.stringify(session.completedExerciseIds),
    session.durationSeconds, session.xpEarned
  );
}

export async function getModuleSessionCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM module_sessions');
  return row?.count ?? 0;
}

export async function getAllModuleSessions(): Promise<ModuleSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM module_sessions ORDER BY date DESC');
  return rows.map((row) => ({
    id: row.id,
    moduleId: row.module_id,
    date: row.date,
    completedExerciseIds: JSON.parse(row.completed_exercise_ids),
    durationSeconds: row.duration_seconds,
    xpEarned: row.xp_earned,
  }));
}

export async function getAllDailyPlans(): Promise<DailyPlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM daily_plans ORDER BY date DESC');
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    exerciseIds: JSON.parse(row.exercise_ids),
    completedAt: row.completed_at,
    xpEarned: row.xp_earned,
  }));
}

// --- ProgressPhotos ---

export async function getPhotos(): Promise<ProgressPhoto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM progress_photos ORDER BY date DESC, id DESC');
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    imageUri: row.image_uri,
    caption: row.caption ?? undefined,
    streakDays: row.streak_days ?? undefined,
    level: row.level ?? undefined,
    totalXP: row.total_xp ?? undefined,
  }));
}

export async function upsertPhoto(photo: ProgressPhoto): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO progress_photos (id, date, image_uri, label, caption, streak_days, level, total_xp)
     VALUES (?, ?, ?, '', ?, ?, ?, ?)`,
    photo.id, photo.date, photo.imageUri,
    photo.caption ?? null, photo.streakDays ?? null, photo.level ?? null, photo.totalXP ?? null
  );
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM progress_photos WHERE id = ?', id);
}

// --- Badges ---

export async function getBadges(): Promise<Badge[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM badges ORDER BY earned_date ASC');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    earnedDate: row.earned_date,
    iconName: row.icon_name,
    isPinned: row.is_pinned as number,
  }));
}

export async function insertBadge(badge: Badge): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO badges (id, name, description, earned_date, icon_name, is_pinned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    badge.id, badge.name, badge.description, badge.earnedDate, badge.iconName, badge.isPinned
  );
}

export async function setPinnedBadge(badgeId: string, slot: 1 | 2 | 3): Promise<void> {
  const db = await getDb();
  // Clear any badge occupying this slot, and un-pin the badge from any other slot
  await db.runAsync('UPDATE badges SET is_pinned = 0 WHERE is_pinned = ? OR id = ?', slot, badgeId);
  await db.runAsync('UPDATE badges SET is_pinned = ? WHERE id = ?', slot, badgeId);
}

// Push a new badge into slot 1, shifting existing slots right and dropping slot 3.
export async function autoEquipNewBadge(badgeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE badges SET is_pinned = 0 WHERE is_pinned = 3');
  await db.runAsync('UPDATE badges SET is_pinned = 3 WHERE is_pinned = 2');
  await db.runAsync('UPDATE badges SET is_pinned = 2 WHERE is_pinned = 1');
  await db.runAsync('UPDATE badges SET is_pinned = 1 WHERE id = ?', badgeId);
}

// --- Module Sessions ---

export async function getCompletedDailyPlanCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_plans WHERE completed_at IS NOT NULL'
  );
  return row?.count ?? 0;
}

export async function getDistinctCompletedModuleIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ module_id: string }>('SELECT DISTINCT module_id FROM module_sessions');
  return new Set(rows.map((r) => r.module_id));
}

export async function getDistinctModuleCountForDay(date: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(DISTINCT module_id) as count FROM module_sessions WHERE date = ?', date
  );
  return row?.count ?? 0;
}

export async function getAllUniqueExerciseIds(): Promise<Set<string>> {
  const db = await getDb();
  const dailyRows = await db.getAllAsync<{ exercise_ids: string }>(
    'SELECT exercise_ids FROM daily_plans WHERE completed_at IS NOT NULL'
  );
  const moduleRows = await db.getAllAsync<{ completed_exercise_ids: string }>(
    'SELECT completed_exercise_ids FROM module_sessions'
  );
  const ids = new Set<string>();
  for (const row of dailyRows) {
    for (const id of JSON.parse(row.exercise_ids) as string[]) ids.add(id);
  }
  for (const row of moduleRows) {
    for (const id of JSON.parse(row.completed_exercise_ids) as string[]) ids.add(id);
  }
  return ids;
}

export async function getCustomExerciseCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM custom_exercises');
  return row?.count ?? 0;
}

export async function getProgressPhotoCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM progress_photos');
  return row?.count ?? 0;
}

export async function getWeekendSessionDayCount(): Promise<number> {
  const db = await getDb();
  const dailyRows = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM daily_plans WHERE completed_at IS NOT NULL'
  );
  const moduleRows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM module_sessions'
  );
  const weekendDates = new Set<string>();
  for (const row of [...dailyRows, ...moduleRows]) {
    const [y, m, d] = row.date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0 || dow === 6) weekendDates.add(row.date);
  }
  return weekendDates.size;
}

export async function getModuleSessionCountForDate(moduleId: string, date: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM module_sessions WHERE module_id = ? AND date = ?',
    moduleId, date
  );
  return row?.count ?? 0;
}

// --- Dev Helpers ---

export async function unlockAllBadges(definitions: { id: string; name: string; description: string; iconName: string }[]): Promise<void> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  for (const def of definitions) {
    await db.runAsync(
      `INSERT OR IGNORE INTO badges (id, name, description, earned_date, icon_name, is_pinned)
       VALUES (?, ?, ?, ?, ?, 0)`,
      def.id, def.name, def.description, today, def.iconName
    );
  }
}

export async function resetAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM user_profile;
    DELETE FROM user_progress;
    DELETE FROM daily_plans;
    DELETE FROM module_sessions;
    DELETE FROM progress_photos;
    DELETE FROM badges;
    DELETE FROM custom_exercises;
  `);
}

// --- Custom Exercises ---

export async function getCustomExercises(): Promise<CustomExercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM custom_exercises ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    photoUri: r.photo_uri ?? null,
    slot: r.slot as ExerciseSlot,
    durationSeconds: r.duration_seconds,
    createdAt: r.created_at,
  }));
}

export async function insertCustomExercise(ex: CustomExercise): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO custom_exercises (id, name, description, photo_uri, slot, duration_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ex.id, ex.name, ex.description, ex.photoUri, ex.slot, ex.durationSeconds, ex.createdAt
  );
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_exercises WHERE id = ?', id);
}

// --- Favorite Modules ---

export async function getFavoriteModuleIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ module_id: string }>(
    'SELECT module_id FROM favorite_modules ORDER BY created_at DESC'
  );
  return rows.map((r) => r.module_id);
}

export async function addFavoriteModule(moduleId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO favorite_modules (module_id, created_at) VALUES (?, ?)',
    moduleId,
    new Date().toISOString()
  );
}

export async function removeFavoriteModule(moduleId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM favorite_modules WHERE module_id = ?', moduleId);
}
