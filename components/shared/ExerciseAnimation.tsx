import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { getExerciseAnimation } from '../../lib/assets/exerciseAnimations';

interface Props {
  exerciseId: string;
  catColor: string;
  slot: string;
  style?: ViewStyle;
}

export function ExerciseAnimation({ exerciseId, catColor, slot, style }: Props) {
  const source = getExerciseAnimation(exerciseId);
  const slotBadge = slot.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, style]}>
      {source ? (
        <LottieView
          source={source as any}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      ) : (
        <>
          <View style={[styles.topBar, { backgroundColor: catColor }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor, opacity: 0.06 }]} />
          <View style={styles.center}>
            <View style={styles.circle}>
              <Text style={styles.circleText}>{slotBadge}</Text>
            </View>
            <Text style={styles.hint}>Animation coming soon</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.tight,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    ...Typography.subheadline,
    color: Colors.secondaryText,
    letterSpacing: 1,
  },
  hint: {
    ...Typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.tertiaryText,
    letterSpacing: 0.5,
  },
});
