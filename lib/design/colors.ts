export const Colors = {
  background: '#0A0E17',
  card: '#121826',
  cardElevated: '#1A2133',
  accent: '#2F6BFF',
  primaryText: '#F4F6FB',
  secondaryText: '#8A93A6',
  tertiaryText: '#6B7488',
  orange: '#FF3B30',
  danger: '#FF4444',
  white: '#FFFFFF',
  transparent: 'transparent',

  // Semantic accents — single source of truth for the recurring category,
  // intensity, and status colors used across the app. Prefer these over
  // hardcoded hex so the palette stays consistent.
  success: '#4EC97B', // easy intensity · mobility category · completed/checkmarks
  streak: '#FF7A33',  // hard intensity · strengthen category · streak/fire
  info: '#4EA8FF',    // moderate intensity · stretch category
  infoMuted: '#A7CBFF',
  custom: '#B57BFF',  // custom programs · awareness category (CUSTOM_PURPLE)
  xp: '#F5C518',      // XP · favorite star
} as const;

export type ColorKey = keyof typeof Colors;
