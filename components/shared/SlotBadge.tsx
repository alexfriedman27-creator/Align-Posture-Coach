import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExerciseSlot, SLOT_BADGE } from '../../types/Exercise';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Radii } from '../../lib/design/radii';

interface Props {
  slot: ExerciseSlot;
  filled?: boolean;
}

export function SlotBadge({ slot, filled }: Props) {
  return (
    <View style={[styles.badge, filled && styles.filled]}>
      <Text style={[styles.text, filled && styles.filledText]}>{SLOT_BADGE[slot]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 36,
    height: 36,
    borderRadius: Radii.chip,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: Colors.accent,
  },
  text: {
    ...Typography.label,
    color: Colors.secondaryText,
  },
  filledText: {
    color: Colors.white,
  },
});
