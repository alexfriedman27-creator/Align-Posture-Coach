import { TextStyle } from 'react-native';
import { Colors } from './colors';

export const FontFamily = {
  outfitExtraBold: 'Outfit-ExtraBold',
  outfitBold: 'Outfit-Bold',
  outfitSemiBold: 'Outfit-SemiBold',
  dmSansRegular: 'DMSans-Regular',
  dmSansMedium: 'DMSans-Medium',
} as const;

export const Typography: Record<string, TextStyle> = {
  display: {
    fontFamily: FontFamily.outfitExtraBold,
    fontSize: 32,
    color: Colors.primaryText,
    lineHeight: 38,
  },
  title: {
    fontFamily: FontFamily.outfitBold,
    fontSize: 26,
    color: Colors.primaryText,
    lineHeight: 32,
  },
  headline: {
    fontFamily: FontFamily.outfitBold,
    fontSize: 23,
    color: Colors.primaryText,
    lineHeight: 28,
  },
  subheadline: {
    fontFamily: FontFamily.outfitSemiBold,
    fontSize: 17,
    color: Colors.primaryText,
    lineHeight: 22,
  },
  body: {
    fontFamily: FontFamily.dmSansRegular,
    fontSize: 15,
    color: Colors.primaryText,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: FontFamily.dmSansMedium,
    fontSize: 15,
    color: Colors.primaryText,
    lineHeight: 21,
  },
  label: {
    fontFamily: FontFamily.outfitBold,
    fontSize: 12,
    color: Colors.primaryText,
    lineHeight: 16,
  },
  caption: {
    fontFamily: FontFamily.dmSansRegular,
    fontSize: 11,
    color: Colors.secondaryText,
    lineHeight: 15,
  },
};
