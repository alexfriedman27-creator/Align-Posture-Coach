import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography, FontFamily } from '../../lib/design/fonts';
import { Radii } from '../../lib/design/radii';
import { Spacing } from '../../lib/design/spacing';

type Variant = 'primary' | 'secondary' | 'text' | 'danger';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: IoniconsName;
}

const ICON_COLOR: Record<Variant, string> = {
  primary: Colors.white,
  secondary: Colors.primaryText,
  text: Colors.secondaryText,
  danger: Colors.danger,
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, icon }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : icon ? (
        <View style={styles.iconRow}>
          <Ionicons name={icon} size={18} color={ICON_COLOR[variant]} />
          <Text style={textStyles[variant]}>{label}</Text>
        </View>
      ) : (
        <Text style={textStyles[variant]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.button,
    paddingVertical: 16,
    paddingHorizontal: Spacing.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: Colors.cardElevated,
  },
  text: {
    backgroundColor: Colors.transparent,
  },
  danger: {
    backgroundColor: Colors.transparent,
  },
  disabled: {
    opacity: 0.5,
  },
});

const textStyles: Record<Variant, TextStyle> = {
  primary: { ...Typography.subheadline, fontSize: 22, lineHeight: 28, color: Colors.white, fontFamily: FontFamily.poppinsExtraBold, letterSpacing: 0.3 },
  secondary: { ...Typography.subheadline },
  text: { ...Typography.body, color: Colors.secondaryText },
  danger: { ...Typography.subheadline, color: Colors.danger },
};
