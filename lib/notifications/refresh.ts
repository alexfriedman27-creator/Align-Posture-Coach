import { useUserStore } from '../store/useUserStore';
import { useProgressStore } from '../store/useProgressStore';
import { getPhotos } from '../db/queries';
import { rescheduleAll } from './notificationService';

// Gathers current app state from the stores + DB and rebuilds the notification
// schedule. Call this anywhere state that affects notifications changes
// (foreground, session complete, reminder/Pro/toggle change). Fire-and-forget.
export async function refreshNotifications(): Promise<void> {
  const profile = useUserStore.getState().profile;
  if (!profile) return;
  const progress = useProgressStore.getState().progress;

  let lastPhotoDate: string | null = null;
  try {
    const photos = await getPhotos();
    lastPhotoDate = photos[0]?.date ?? null; // getPhotos is ordered date DESC
  } catch {
    // photos table unavailable — leave null
  }

  await rescheduleAll({
    enabled: profile.notificationsEnabled,
    reminderHour: profile.reminderHour,
    reminderMinute: profile.reminderMinute,
    isPro: profile.isPro,
    streakDays: progress?.streakDays ?? 0,
    lastSessionDate: progress?.lastSessionDate ?? null,
    lastPhotoDate,
  });
}
