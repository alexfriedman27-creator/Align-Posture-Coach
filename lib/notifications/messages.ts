// Notification copy banks. Short, title-heavy, rotating so reminders never feel
// canned (Duolingo / fitness-app retention playbook). Keep titles <= ~6 words.

export type NotificationCategory =
  | 'motivational'
  | 'streakActive'
  | 'streakStart'
  | 'photo'
  | 'pro';

export interface NotificationCopy {
  title: string;
  body: string;
}

// Generic nudges. Low-pressure, benefit-led ("look better in 5 minutes").
const MOTIVATIONAL: NotificationCopy[] = [
  { title: 'Stand taller today', body: 'Just 5 minutes to undo a day of slouching.' },
  { title: '5 minutes, better posture', body: 'A quick session is all it takes to feel the difference.' },
  { title: 'Your back called', body: 'It wants 5 minutes of your day. Worth it.' },
  { title: 'Look more confident', body: 'Open up those shoulders — your future self says thanks.' },
  { title: 'Loosen up', body: 'Sitting all day? Let’s reset your spine in 5 minutes.' },
  { title: 'Small habit, big change', body: 'One short session today keeps the aches away.' },
];

// Streak protection for users with an active streak. Mild guilt + urgency.
const STREAK_ACTIVE: NotificationCopy[] = [
  { title: 'Keep your streak alive 🔥', body: 'You’ve come too far to stop now. 5 minutes saves it.' },
  { title: 'Don’t break the chain', body: 'Your streak is waiting. Finish today’s session.' },
  { title: 'Protect your streak', body: 'A quick session now keeps your run going strong.' },
];

// Evening last-chance variant — fired at 8pm if they haven't trained.
const STREAK_EVENING: NotificationCopy[] = [
  { title: 'Your streak ends at midnight', body: 'There’s still time. 5 minutes and it’s safe.' },
  { title: 'Last chance today ⏳', body: 'Don’t lose your streak — knock out a quick session.' },
  { title: 'Almost lost it', body: 'Your streak resets soon. Save it in 5 minutes.' },
];

// For users with no current streak — encourage starting one.
const STREAK_START: NotificationCopy[] = [
  { title: 'Start a streak today', body: 'Day 1 is the hardest. Take the first 5 minutes.' },
  { title: 'Build the habit', body: 'One session today. Tomorrow it’s a streak.' },
  { title: 'A fresh start', body: 'No streak yet? Let’s fix that in 5 minutes.' },
];

// Progress-photo nudges (the progress_photos feature already exists).
const PHOTO: NotificationCopy[] = [
  { title: 'Time for a progress photo', body: 'See how far your posture has come. Snap one now.' },
  { title: 'Capture your progress 📸', body: 'A quick photo today is proof of your hard work.' },
  { title: 'How far have you come?', body: 'Add a progress photo and watch the change add up.' },
];

// Pro upsell — only shown to free users.
const PRO: NotificationCopy[] = [
  { title: 'Unlock every program', body: 'Go Pro for all 20 guided programs, built for you.' },
  { title: 'Go further with Pro', body: 'Custom programs, full library, deeper progress tracking.' },
  { title: 'Your posture, upgraded', body: 'Pro unlocks everything Align has to offer.' },
];

const BANKS: Record<NotificationCategory, NotificationCopy[]> = {
  motivational: MOTIVATIONAL,
  streakActive: STREAK_ACTIVE,
  streakStart: STREAK_START,
  photo: PHOTO,
  pro: PRO,
};

/** Pick a copy from a category, rotated by a seed so it varies day to day. */
export function pickMessage(category: NotificationCategory, seed: number): NotificationCopy {
  const bank = BANKS[category];
  const i = Math.abs(Math.floor(seed)) % bank.length;
  return bank[i];
}

/** Evening streak-saver bank (separate, more urgent voice). */
export function pickStreakEvening(seed: number): NotificationCopy {
  const i = Math.abs(Math.floor(seed)) % STREAK_EVENING.length;
  return STREAK_EVENING[i];
}

/** Insert the live streak count into copy when it reads naturally. */
export function withStreakCount(copy: NotificationCopy, streakDays: number): NotificationCopy {
  if (streakDays <= 1) return copy;
  return { ...copy, title: copy.title.replace('your streak', `your ${streakDays}-day streak`) };
}
