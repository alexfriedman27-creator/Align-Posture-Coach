import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { getExerciseAnimation } from '../../lib/assets/exerciseAnimations';
import { SLOT_BADGE } from '../../types/Exercise';

interface Props {
  exerciseId: string;
  /** Category color (CATEGORY_COLOR[exercise.category]) — used for the subtle corner accent. */
  catColor: string;
  /** Exercise slot — used for the placeholder badge. */
  slot: string;
  style?: ViewStyle;
}

/**
 * Single, consistent presentation for every exercise demo — "minimal elegant"
 * finish. One library (Lottie) renders the thin gradient figure; the frame is
 * a clean dark surface with a single subtle category-colored corner dot (no
 * heavy bars), identical for all 56 so the look stays sleek and on-theme.
 * Falls back to a quiet placeholder when an animation isn't present yet.
 */
export function ExerciseAnimation({ exerciseId, catColor, slot, style }: Props) {
  const source = getExerciseAnimation(exerciseId);
  const badge = (SLOT_BADGE as Record<string, string>)[slot] ?? slot.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, style]}>
      {source ? (
        <LottieView
          source={source as any}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.lottie}
        />
      ) : (
        <View style={styles.center}>
          <View style={[styles.badge, { borderColor: catColor + '55' }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>{badge}</Text>
          </View>
          <Text style={styles.hint}>Animation coming soon</Text>
        </View>
      )}

      {/* Minimal category accent — a single subtle corner dot */}
      <View style={[styles.dot, { backgroundColor: catColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.85,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.tight,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...Typography.subheadline,
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
