export type UserGoal =
  | 'fixPosture'
  | 'reducePain'
  | 'moveAndFeel'
  | 'lookConfident';

export const GOAL_DISPLAY: Record<UserGoal, string> = {
  fixPosture: 'Fix my posture',
  reducePain: 'Reduce back & neck pain',
  moveAndFeel: 'Move & feel better',
  lookConfident: 'Look more confident',
};

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  goal: UserGoal;
  reminderHour: number;
  reminderMinute: number;
  onboardingCompleted: boolean;
  isPro: boolean;
  reminderSet: boolean;
  notificationsEnabled: boolean;
}
