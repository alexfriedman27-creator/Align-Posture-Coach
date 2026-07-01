import * as Notifications from 'expo-notifications';
import {
  NotificationCategory,
  NotificationCopy,
  pickMessage,
  pickStreakEvening,
  withStreakCount,
} from './messages';

// On-device local notification engine. No push backend — we schedule a rolling
// 7-day horizon of concrete DATE-triggered notifications and rebuild it whenever
// app state changes (foreground, session complete, reminder/Pro/toggle change).

const HORIZON_DAYS = 7;
const MIDDAY_HOUR = 13; // 1pm motivational / Pro slot
const PHOTO_HOUR = 14; // 2pm — offset from midday so they don't collide
const EVENING_HOUR = 20; // 8pm streak-saver

export interface ScheduleInput {
  enabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  isPro: boolean;
  streakDays: number;
  lastSessionDate: string | null; // 'YYYY-MM-DD'
  lastPhotoDate: string | null; // 'YYYY-MM-DD'
}

/** Map a notification category to an in-app route for tap handling. */
const ROUTE_BY_CATEGORY: Record<NotificationCategory, string> = {
  motivational: 'today',
  streakActive: 'today',
  streakStart: 'today',
  photo: 'progress',
  pro: 'paywall',
};

// --- handler + permissions -------------------------------------------------

/** Call once at app start (module scope in _layout) so notifications show in-app. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getPermissionStatus(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

export async function requestPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const settings = await Notifications.requestPermissionsAsync();
  return settings.granted;
}

// --- date helpers ----------------------------------------------------------

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function at(day: Date, hour: number, minute: number): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateSeed(dateString: string): number {
  let hash = 0;
  for (const c of dateString) hash = (Math.imul(31, hash) + c.charCodeAt(0)) | 0;
  return hash;
}

function daysSince(dateStr: string | null, today: Date): number {
  if (!dateStr) return Infinity;
  const past = new Date(`${dateStr}T00:00:00`);
  if (isNaN(past.getTime())) return Infinity;
  const start = at(today, 0, 0);
  return Math.round((start.getTime() - past.getTime()) / 86_400_000);
}

// --- scheduling ------------------------------------------------------------

interface PlannedNotification {
  date: Date;
  copy: NotificationCopy;
  category: NotificationCategory;
}

function buildSchedule(input: ScheduleInput, now: Date): PlannedNotification[] {
  const todayStr = ymd(now);
  const trainedToday = input.lastSessionDate === todayStr;
  const hasStreak = input.streakDays > 0;
  const photoStale = daysSince(input.lastPhotoDate, now) >= 7;

  const planned: PlannedNotification[] = [];
  const push = (date: Date, copy: NotificationCopy, category: NotificationCategory) => {
    if (date > now) planned.push({ date, copy, category });
  };

  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const seed = dateSeed(ymd(day));
    const isToday = offset === 0;
    // Only *today* is suppressible once trained; future days always schedule and
    // get rebuilt on the next foreground.
    const suppress = isToday && trainedToday;
    if (suppress) continue;

    // Morning reminder at the user's chosen time.
    {
      let copy: NotificationCopy;
      if (hasStreak) {
        copy =
          seed % 2 === 0
            ? withStreakCount(pickMessage('streakActive', seed), input.streakDays)
            : pickMessage('motivational', seed);
      } else {
        copy = seed % 2 === 0 ? pickMessage('motivational', seed) : pickMessage('streakStart', seed);
      }
      push(at(day, input.reminderHour, input.reminderMinute), copy, hasStreak ? 'streakActive' : 'motivational');
    }

    // Midday — motivational, with a Pro upsell every 3rd day for free users.
    if (!input.isPro && offset % 3 === 2) {
      push(at(day, MIDDAY_HOUR, 0), pickMessage('pro', seed), 'pro');
    } else {
      push(at(day, MIDDAY_HOUR, 0), pickMessage('motivational', seed + 7), 'motivational');
    }

    // Evening streak-saver — only when there's a streak worth protecting.
    if (hasStreak) {
      const copy = withStreakCount(pickStreakEvening(seed), input.streakDays);
      push(at(day, EVENING_HOUR, 0), copy, 'streakActive');
    }

    // Progress-photo nudge — once, around day +3, if it's been a week.
    if (offset === 3 && photoStale) {
      push(at(day, PHOTO_HOUR, 0), pickMessage('photo', seed), 'photo');
    }
  }

  return planned;
}

/** Cancel everything and rebuild the full schedule from current state. */
export async function rescheduleAll(input: ScheduleInput): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!input.enabled) return;
  if (!(await getPermissionStatus())) return;

  const planned = buildSchedule(input, new Date());
  for (const item of planned) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.copy.title,
        body: item.copy.body,
        data: { type: item.category, route: ROUTE_BY_CATEGORY[item.category] },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
    });
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledCount(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.length;
}

// --- dev helpers -----------------------------------------------------------

/** Fire a sample of one category ~3s out so a dev can background the app to see it. */
export async function fireTestNotification(category: NotificationCategory): Promise<void> {
  const seed = Date.now();
  const copy = category === 'streakActive' ? pickStreakEvening(seed) : pickMessage(category, seed);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data: { type: category, route: ROUTE_BY_CATEGORY[category] },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
}
