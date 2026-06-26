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
  caption: {
    fontFamily: FontFamily.poppinsRegular,
    fontSize: 11,
    color: Colors.secondaryText,
    lineHeight: 15,
  },
};
