import { TextStyle } from 'react-native';
import { Colors } from './colors';

export const FontFamily = {
  poppinsExtraBold: 'Poppins-ExtraBold',
  poppinsBold: 'Poppins-Bold',
  poppinsSemiBold: 'Poppins-SemiBold',
  poppinsMedium: 'Poppins-Medium',
  poppinsRegular: 'Poppins-Regular',
} as const;

export const Typography: Record<string, TextStyle> = {
  display: {
    fontFamily: FontFamily.poppinsExtraBold,
    fontSize: 32,
    color: Colors.primaryText,
    lineHeight: 38,
  },
  title: {
    fontFamily: FontFamily.poppinsBold,
    fontSize: 26,
    color: Colors.primaryText,
    lineHeight: 32,
  },
  headline: {
    fontFamily: FontFamily.poppinsBold,
    fontSize: 23,
    color: Colors.primaryText,
    lineHeight: 28,
  },
  subheadline: {
    fontFamily: FontFamily.poppinsSemiBold,
    fontSize: 17,
    color: Colors.primaryText,
    lineHeight: 22,
  },
  body: {
    fontFamily: FontFamily.poppinsRegular,
    fontSize: 15,
    color: Colors.primaryText,
    lineHeight: 21,
  },
  // Emphasis body — same weight as `body`, one step up for hero meta,
  // upgrade copy, and other places that read larger.
  bodyLg: {
    fontFamily: FontFamily.poppinsRegular,
    fontSize: 17,
    color: Colors.primaryText,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: FontFamily.poppinsMedium,
    fontSize: 15,
    color: Colors.primaryText,
    lineHeight: 21,
  },
  label: {
    fontFamily: FontFamily.poppinsBold,
    fontSize: 12,
    color: Colors.primaryText,
    lineHeight: 16,
  },
  // Emphasis label — bold eyebrow/chip text one step up from `label`.
  labelLg: {
    fontFamily: FontFamily.poppinsBold,
    fontSize: 14,
    color: Colors.primaryText,
    lineHeight: 18,
  },
  caption: {
    fontFamily: FontFamily.poppinsRegular,
    fontSize: 11,
    color: Colors.secondaryText,
    lineHeight: 15,
  },
  // Emphasis caption — the app's de-facto "small" size (meta rows,
  // sublabels). Larger and more legible than the 11px `caption`.
  captionLg: {
    fontFamily: FontFamily.poppinsRegular,
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
};
