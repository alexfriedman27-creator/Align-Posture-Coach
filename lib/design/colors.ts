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
} as const;

export type ColorKey = keyof typeof Colors;
