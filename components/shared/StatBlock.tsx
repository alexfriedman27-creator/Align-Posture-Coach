import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Radii } from '../../lib/design/radii';
import { Spacing } from '../../lib/design/spacing';

interface Props {
  value: string | number;
  label: string;
  style?: ViewStyle;
  accentValue?: boolean;
}

export function StatBlock({ value, label, style, accentValue }: Props) {
  return (
    <View style={[styles.block, style]}>
      <Text style={[styles.value, accentValue && { color: Colors.accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    alignItems: 'center',
    flex: 1,
  },
  value: {
    ...Typography.title,
    color: Colors.primaryText,
  },
  label: {
    ...Typography.caption,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
