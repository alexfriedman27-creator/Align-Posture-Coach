export type BadgeCategory =
  | 'streak'
  | 'sessions'
  | 'daily'
  | 'time'
  | 'exercises'
  | 'modules'
  | 'level'
  | 'custom'
  | 'photo'
  | 'special';

export const CATEGORY_COLORS: Record<BadgeCategory, string> = {
  streak:    '#FF7A33',
  sessions:  '#4EA8FF',
  daily:     '#A78BFA',
  time:      '#34D399',
  exercises: '#22D3EE',
  modules:   '#84CC16',
  level:     '#FBBF24',
  custom:    '#F472B6',
  photo:     '#FB7185',
  special:   '#94A3B8',
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  streak:    'Streaks',
  sessions:  'Sessions',
  daily:     'Daily Plans',
  time:      'Time',
  exercises: 'Exercise Variety',
  modules:   'Programs',
  level:     'Levels',
  custom:    'Custom Content',
  photo:     'Progress Photos',
  special:   'Special',
};

export const BADGE_CATEGORY_ORDER: BadgeCategory[] = [
  'streak', 'sessions', 'daily', 'modules', 'exercises', 'time', 'level', 'custom', 'photo', 'special',
];

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: BadgeCategory;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedDate: string;
  iconName: string;
  isPinned: number; // 0 = not pinned, 1/2/3 = featured slot
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Streak
  { id: 'streak_3',   name: 'Started Strong',        description: 'Reached a 3-day streak',    iconName: 'flame',   category: 'streak' },
  { id: 'streak_7',   name: 'One Week Upright',       description: 'Reached a 7-day streak',    iconName: 'flame',   category: 'streak' },
  { id: 'streak_14',  name: '14 Days Standing Tall',  description: 'Reached a 14-day streak',   iconName: 'flame',   category: 'streak' },
  { id: 'streak_30',  name: '30 Days Upright',        description: 'Reached a 30-day streak',   iconName: 'flame',   category: 'streak' },
  { id: 'streak_60',  name: '60-Day Consistency',     description: 'Reached a 60-day streak',   iconName: 'diamond', category: 'streak' },
  { id: 'streak_90',  name: '90-Day Transformation',  description: 'Reached a 90-day streak',   iconName: 'diamond', category: 'streak' },
  { id: 'streak_100', name: 'Unbreakable',            description: 'Reached a 100-day streak',  iconName: 'diamond', category: 'streak' },
  { id: 'streak_180', name: 'Half-Year Hero',         description: 'Reached a 180-day streak',  iconName: 'trophy',  category: 'streak' },
  { id: 'streak_365', name: 'Posture Master',         description: 'Reached a 365-day streak',  iconName: 'trophy',  category: 'streak' },

  // Sessions
  { id: 'first_session',  name: 'First Step',    description: 'Completed your first session',  iconName: 'play-circle', category: 'sessions' },
  { id: 'sessions_10',    name: 'Apprentice',    description: 'Completed 10 sessions',         iconName: 'ribbon',      category: 'sessions' },
  { id: 'sessions_25',    name: 'Practitioner',  description: 'Completed 25 sessions',         iconName: 'ribbon',      category: 'sessions' },
  { id: 'sessions_50',    name: 'Dedicated',     description: 'Completed 50 sessions',         iconName: 'medal',       category: 'sessions' },
  { id: 'sessions_100',   name: 'Advanced',      description: 'Completed 100 sessions',        iconName: 'medal',       category: 'sessions' },
  { id: 'sessions_250',   name: 'Expert',        description: 'Completed 250 sessions',        iconName: 'trophy',      category: 'sessions' },
  { id: 'sessions_500',   name: 'Elite',         description: 'Completed 500 sessions',        iconName: 'trophy',      category: 'sessions' },
  { id: 'sessions_1000',  name: 'Master',        description: 'Completed 1000 sessions',       iconName: 'star',        category: 'sessions' },

  // Daily plans
  { id: 'daily_10',   name: 'Routine Starter',  description: 'Completed 10 daily plans',   iconName: 'calendar', category: 'daily' },
  { id: 'daily_30',   name: 'Habit Formed',      description: 'Completed 30 daily plans',   iconName: 'calendar', category: 'daily' },
  { id: 'daily_100',  name: 'Daily Devotee',     description: 'Completed 100 daily plans',  iconName: 'calendar', category: 'daily' },

  // Modules
  { id: 'modules_tried_2',    name: 'First Dive',          description: 'Tried 2 different programs',               iconName: 'library', category: 'modules' },
  { id: 'modules_tried_3',    name: 'Getting Curious',     description: 'Tried 3 different programs',               iconName: 'library', category: 'modules' },
  { id: 'modules_tried_5',    name: 'Library Regular',     description: 'Tried 5 different programs',               iconName: 'library', category: 'modules' },
  { id: 'modules_tried_10',   name: 'Program Hopper',      description: 'Tried 10 different programs',              iconName: 'library', category: 'modules' },
  { id: 'module_completionist', name: 'Program Completionist', description: 'Completed every built-in program',      iconName: 'checkmark-done-circle', category: 'modules' },
  { id: 'same_day_2',   name: 'Double Session',  description: 'Completed 2 different programs in one day',   iconName: 'layers',  category: 'modules' },
  { id: 'same_day_3',   name: 'Triple Threat',   description: 'Completed 3 different programs in one day',   iconName: 'layers',  category: 'modules' },
  { id: 'same_day_5',   name: 'Five Star Day',   description: 'Completed 5 different programs in one day',   iconName: 'layers',  category: 'modules' },
  { id: 'same_day_10',  name: 'Unstoppable',     description: 'Completed 10 different programs in one day',  iconName: 'rocket',  category: 'modules' },

  // Exercise variety
  { id: 'exercises_10',   name: 'Explorer',       description: 'Tried 10 different exercises',       iconName: 'compass',              category: 'exercises' },
  { id: 'exercises_25',   name: 'Adventurer',     description: 'Tried 25 different exercises',       iconName: 'compass',              category: 'exercises' },
  { id: 'exercises_50',   name: 'Experimenter',   description: 'Tried 50 different exercises',       iconName: 'flask',                category: 'exercises' },
  { id: 'exercises_all',  name: 'Completionist',  description: 'Tried every built-in exercise',      iconName: 'checkmark-done',       category: 'exercises' },

  // Time
  { id: 'time_10m',  name: 'Moving More',         description: 'Accumulated 10 minutes of exercise',   iconName: 'timer', category: 'time' },
  { id: 'time_1h',   name: 'Mobility Student',    description: 'Accumulated 1 hour of exercise',       iconName: 'timer', category: 'time' },
  { id: 'time_10h',  name: 'Flexibility Builder', description: 'Accumulated 10 hours of exercise',     iconName: 'time',  category: 'time' },
  { id: 'time_50h',  name: 'Recovery Veteran',    description: 'Accumulated 50 hours of exercise',     iconName: 'time',  category: 'time' },

  // Level
  { id: 'level_3',    name: 'Level 3',      description: 'Reached Level 3',    iconName: 'star',      category: 'level' },
  { id: 'level_5',    name: 'Rising',       description: 'Reached Level 5',    iconName: 'star',      category: 'level' },
  { id: 'level_10',   name: 'Grounded',     description: 'Reached Level 10',   iconName: 'star',      category: 'level' },
  { id: 'level_25',   name: 'Established',  description: 'Reached Level 25',   iconName: 'sparkles',  category: 'level' },
  { id: 'level_50',   name: 'Apex',         description: 'Reached Level 50',   iconName: 'sparkles',  category: 'level' },
  { id: 'level_100',  name: 'Legend',       description: 'Reached Level 100',  iconName: 'sparkles',  category: 'level' },

  // Custom exercises
  { id: 'custom_ex_1',   name: 'Exercise Inventor',   description: 'Created your first custom exercise',  iconName: 'pencil',  category: 'custom' },
  { id: 'custom_ex_5',   name: 'Creative Mover',      description: 'Created 5 custom exercises',          iconName: 'pencil',  category: 'custom' },
  { id: 'custom_ex_10',  name: 'Training Designer',   description: 'Created 10 custom exercises',         iconName: 'hammer',  category: 'custom' },

  // Progress photos
  { id: 'photo_1',   name: 'First Progress Photo',  description: 'Uploaded your first progress photo',  iconName: 'camera', category: 'photo' },
  { id: 'photo_10',  name: 'Progress Tracker',      description: 'Uploaded 10 progress photos',         iconName: 'images', category: 'photo' },

  // Special
  { id: 'early_bird',       name: 'Early Bird',             description: 'Completed a session before 7 AM',             iconName: 'sunny',    category: 'special' },
  { id: 'night_owl',        name: 'Night Owl',              description: 'Completed a session after 10 PM',             iconName: 'moon',     category: 'special' },
  { id: 'weekend_warrior',  name: 'Weekend Warrior',        description: 'Trained on 10 different weekends',            iconName: 'calendar-outline', category: 'special' },
  { id: 'comeback_kid',     name: 'Comeback Kid',           description: 'Returned after 30 days away',                 iconName: 'refresh',  category: 'special' },
  { id: 'marathon_session', name: 'Marathon Session',       description: 'Completed a single session over 20 minutes',  iconName: 'hourglass', category: 'special' },
];

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((d) => d.id === id);
}
