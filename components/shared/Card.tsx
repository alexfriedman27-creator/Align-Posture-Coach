import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../lib/design/colors';
import { Radii } from '../../lib/design/radii';
import { Spacing } from '../../lib/design/spacing';

interface Props {
  children: React.ReactNode;
  elevated?: boolean;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, elevated, style, padding = Spacing.card }: Props) {
  return (
    <View style={[styles.card, elevated && styles.elevated, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
  },
  elevated: {
    backgroundColor: Colors.cardElevated,
  },
});
