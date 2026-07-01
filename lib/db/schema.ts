import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('align.db');
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL DEFAULT '',
      goal TEXT NOT NULL,
      problem_areas TEXT NOT NULL DEFAULT '[]',
      reminder_hour INTEGER NOT NULL DEFAULT 8,
      reminder_minute INTEGER NOT NULL DEFAULT 0,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      is_pro INTEGER NOT NULL DEFAULT 0,
      reminder_set INTEGER NOT NULL DEFAULT 0,
      notifications_enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      total_xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak_days INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      last_session_date TEXT,
      thirty_day_dates TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      exercise_ids TEXT NOT NULL DEFAULT '[]',
      completed_at TEXT,
      xp_earned INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS module_sessions (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed_exercise_ids TEXT NOT NULL DEFAULT '[]',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS progress_photos (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      earned_date TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_uri TEXT,
      slot TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL
    );
  `);

  // Migration: add reminder_set column if it doesn't exist yet
  try {
    await database.execAsync('ALTER TABLE user_profile ADD COLUMN reminder_set INTEGER NOT NULL DEFAULT 0');
  } catch {
    // column already exists
  }

  // Migration: add notifications_enabled column if it doesn't exist yet
  try {
    await database.execAsync('ALTER TABLE user_profile ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1');
  } catch {
    // column already exists
  }

  // Migration: favorite_modules table
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS favorite_modules (
        module_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      )
    `);
  } catch {
    // table already exists
  }

  // Migration: custom_programs table
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS custom_programs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        exercise_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      )
    `);
  } catch {
    // table already exists
  }

  // Migration: progress_photos — new columns
  for (const col of [
    'ALTER TABLE progress_photos ADD COLUMN caption TEXT',
    'ALTER TABLE progress_photos ADD COLUMN module_id TEXT',
    'ALTER TABLE progress_photos ADD COLUMN streak_days INTEGER',
    'ALTER TABLE progress_photos ADD COLUMN level INTEGER',
    'ALTER TABLE progress_photos ADD COLUMN total_xp INTEGER',
  ]) {
    try { await database.execAsync(col); } catch { /* column already exists */ }
  }
}
