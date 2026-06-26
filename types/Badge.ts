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
  'sessions', 'streak', 'daily', 'time', 'exercises', 'modules', 'level', 'photo', 'custom', 'special',
];

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string;
  stars?: number; // 1–3 tier dots shown below the badge icon; undefined = no dots
  color?: string; // overrides CATEGORY_COLORS when set (used for special badges)
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
  // Streak — flame (3) → diamond (3) → trophy (3), each tier uses stars 1/2/3
  { id: 'streak_3',   name: 'First Spark',      description: 'Reached a 3-day streak',    iconName: 'flame',   stars: 1, category: 'streak' },
  { id: 'streak_7',   name: 'Kindled',           description: 'Reached a 7-day streak',    iconName: 'flame',   stars: 2, category: 'streak' },
  { id: 'streak_14',  name: 'Burning Bright',    description: 'Reached a 14-day streak',   iconName: 'flame',   stars: 3, category: 'streak' },
  { id: 'streak_30',  name: 'Diamond Habit',     description: 'Reached a 30-day streak',   iconName: 'diamond', stars: 1, category: 'streak' },
  { id: 'streak_60',  name: 'Uncut',             description: 'Reached a 60-day streak',   iconName: 'diamond', stars: 2, category: 'streak' },
  { id: 'streak_90',  name: 'Diamond Days',      description: 'Reached a 90-day streak',   iconName: 'diamond', stars: 3, category: 'streak' },
  { id: 'streak_100', name: 'The Century',       description: 'Reached a 100-day streak',  iconName: 'trophy',  stars: 1, category: 'streak' },
  { id: 'streak_180', name: 'Half-Year Hero',    description: 'Reached a 180-day streak',  iconName: 'trophy',  stars: 2, category: 'streak' },
  { id: 'streak_365', name: 'Year in Motion',    description: 'Reached a 365-day streak',  iconName: 'trophy',  stars: 3, category: 'streak' },

  // Sessions
  { id: 'first_session',  name: 'Day One',           description: 'Completed your first session',  iconName: 'play-circle',     category: 'sessions' },
  { id: 'sessions_10',    name: 'Ten in the Books',  description: 'Completed 10 sessions',         iconName: 'ribbon',          stars: 1, category: 'sessions' },
  { id: 'sessions_25',    name: 'Quarter Century',   description: 'Completed 25 sessions',         iconName: 'ribbon',          stars: 2, category: 'sessions' },
  { id: 'sessions_50',    name: 'Half-Century',      description: 'Completed 50 sessions',         iconName: 'medal',           stars: 1, category: 'sessions' },
  { id: 'sessions_100',   name: 'Triple Digits',     description: 'Completed 100 sessions',        iconName: 'medal',           stars: 2, category: 'sessions' },
  { id: 'sessions_250',   name: 'The Long Game',     description: 'Completed 250 sessions',        iconName: 'shield-checkmark',             category: 'sessions' },
  { id: 'sessions_500',   name: 'Five Hundred',      description: 'Completed 500 sessions',        iconName: 'infinite',                     category: 'sessions' },
  { id: 'sessions_1000',  name: 'Thousand Club',     description: 'Completed 1000 sessions',       iconName: 'star',                         category: 'sessions' },

  // Daily plans
  { id: 'daily_10',   name: 'Taking Root',     description: 'Completed 10 daily plans',   iconName: 'calendar', stars: 1, category: 'daily' },
  { id: 'daily_30',   name: 'Habit Formed',    description: 'Completed 30 daily plans',   iconName: 'calendar', stars: 2, category: 'daily' },
  { id: 'daily_100',  name: 'Daily Devotee',   description: 'Completed 100 daily plans',  iconName: 'calendar', stars: 3, category: 'daily' },

  // Modules (programs)
  { id: 'modules_tried_2',      name: 'First Detour',          description: 'Tried 2 different programs',              iconName: 'book',                  stars: 1, category: 'modules' },
  { id: 'modules_tried_3',      name: 'Getting Curious',       description: 'Tried 3 different programs',              iconName: 'book',                  stars: 2, category: 'modules' },
  { id: 'modules_tried_5',      name: 'Library Card',          description: 'Tried 5 different programs',              iconName: 'book',                  stars: 3, category: 'modules' },
  { id: 'modules_tried_10',     name: 'Full Shelf',            description: 'Tried 10 different programs',             iconName: 'bookmarks',                       category: 'modules' },
  { id: 'module_completionist', name: 'Full Sweep',            description: 'Completed every built-in program',        iconName: 'checkmark-done-circle',           category: 'modules' },
  { id: 'same_day_2',           name: 'Double Down',           description: 'Completed 2 different programs in one day', iconName: 'layers',              stars: 1, category: 'modules' },
  { id: 'same_day_3',           name: 'Triple Threat',         description: 'Completed 3 different programs in one day', iconName: 'layers',              stars: 2, category: 'modules' },
  { id: 'same_day_5',           name: 'Five-a-Day',            description: 'Completed 5 different programs in one day', iconName: 'layers',              stars: 3, category: 'modules' },
  { id: 'same_day_10',          name: 'Unstoppable',           description: 'Completed 10 different programs in one day', iconName: 'rocket',                       category: 'modules' },

  // Exercise variety
  { id: 'exercises_10',   name: 'Early Explorer',  description: 'Tried 10 different exercises',    iconName: 'compass', stars: 1, category: 'exercises' },
  { id: 'exercises_25',   name: 'Body Scholar',    description: 'Tried 25 different exercises',    iconName: 'compass', stars: 2, category: 'exercises' },
  { id: 'exercises_50',   name: 'Lab Rat',         description: 'Tried 50 different exercises',    iconName: 'flask',              category: 'exercises' },
  { id: 'exercises_all',  name: 'Full Range',      description: 'Tried every built-in exercise',   iconName: 'barbell',            category: 'exercises' },

  // Time
  { id: 'time_10m',  name: 'Moving More',       description: 'Accumulated 10 minutes of exercise',   iconName: 'timer', stars: 1, category: 'time' },
  { id: 'time_1h',   name: 'First Hour',        description: 'Accumulated 1 hour of exercise',       iconName: 'timer', stars: 2, category: 'time' },
  { id: 'time_10h',  name: 'Ten Hours Deep',    description: 'Accumulated 10 hours of exercise',     iconName: 'time',  stars: 1, category: 'time' },
  { id: 'time_50h',  name: 'Time Well Spent',   description: 'Accumulated 50 hours of exercise',     iconName: 'time',  stars: 2, category: 'time' },

  // Level — trending-up (3) → sparkles (3)
  { id: 'level_3',    name: 'Ember',       description: 'Your spark is lit. Keep it going.',            iconName: 'trending-up', stars: 1, category: 'level' },
  { id: 'level_5',    name: 'Ignited',     description: 'Five levels in. The habit is taking hold.',    iconName: 'trending-up', stars: 2, category: 'level' },
  { id: 'level_10',   name: 'Grounded',    description: 'Ten levels of consistency. Something real is being built.', iconName: 'trending-up', stars: 3, category: 'level' },
  { id: 'level_25',   name: 'Ascendant',   description: 'A quarter of the way up. Most never get here.',  iconName: 'sparkles',    stars: 1, category: 'level' },
  { id: 'level_50',   name: 'Apex',        description: 'Halfway to the top. The view is better from here.', iconName: 'sparkles',    stars: 2, category: 'level' },
  { id: 'level_100',  name: 'Legend',      description: 'Every level earned. The full climb, complete.',  iconName: 'sparkles',    stars: 3, category: 'level' },

  // Custom exercises
  { id: 'custom_ex_1',   name: 'The Blueprint',    description: 'Created your first custom exercise',  iconName: 'pencil',    category: 'custom' },
  { id: 'custom_ex_5',   name: 'Creative Mover',   description: 'Created 5 custom exercises',          iconName: 'create',    category: 'custom' },
  { id: 'custom_ex_10',  name: 'The Architect',    description: 'Created 10 custom exercises',         iconName: 'construct', category: 'custom' },

  // Progress photos
  { id: 'photo_1',   name: 'First Frame',   description: 'Uploaded your first progress photo',  iconName: 'camera', category: 'photo' },
  { id: 'photo_10',  name: 'In Focus',      description: 'Uploaded 10 progress photos',         iconName: 'images', category: 'photo' },

  // Special — each has its own color
  { id: 'early_bird',       name: 'Early Bird',       description: 'Completed a session before 7 AM',             iconName: 'sunny',     color: '#F59E0B', category: 'special' },
  { id: 'night_owl',        name: 'Night Owl',         description: 'Completed a session after 10 PM',             iconName: 'moon',      color: '#818CF8', category: 'special' },
  { id: 'weekend_warrior',  name: 'Weekend Warrior',   description: 'Trained on 10 different weekends',            iconName: 'flash',     color: '#F97316', category: 'special' },
  { id: 'comeback_kid',     name: 'Comeback Kid',      description: 'Returned after 30 days away',                 iconName: 'refresh',   color: '#10B981', category: 'special' },
  { id: 'marathon_session', name: 'The Long Stretch',  description: 'Completed a single session over 20 minutes',  iconName: 'hourglass', color: '#A855F7', category: 'special' },
];

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((d) => d.id === id);
}
