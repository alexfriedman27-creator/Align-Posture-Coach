import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { getCustomExercises } from '../lib/db/queries';
import { ExerciseCategory, SLOT_NAME, SLOT_BADGE } from '../types/Exercise';
import { CustomExercise } from '../types/CustomExercise';

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  stretch: '#4EA8FF',
  strengthen: '#FF7A33',
  mobility: '#4EC97B',
  awareness: '#B57BFF',
};

const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  stretch: 'Stretch',
  strengthen: 'Strengthen',
  mobility: 'Mobility',
  awareness: 'Practice',
};

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id, kind } = useLocalSearchParams<{ id: string; kind: string }>();
  const [customEx, setCustomEx] = useState<CustomExercise | null>(null);

  useEffect(() => {
    if (kind === 'custom') {
      getCustomExercises().then((all) => {
        const found = all.find((e) => e.id === id);
        if (found) setCustomEx(found);
      });
    }
  }, [id, kind]);

  const exercise = kind === 'builtin' ? exerciseRepository.exercise(id) : null;

  if (kind === 'builtin' && !exercise) return null;
  if (kind === 'custom' && !customEx) return null;

  const name          = exercise?.name ?? customEx!.name;
  const slot          = exercise?.slot ?? customEx!.slot;
  const description   = exercise?.description ?? customEx!.description;
  const duration      = exercise?.duration_seconds ?? customEx!.durationSeconds;
  const category      = exercise?.category ?? null;
  const instructions  = exercise?.instructions ?? [];
  const position      = exercise?.position ?? null;
  const equipment     = exercise?.equipment ?? null;

  const slotBadge = SLOT_BADGE[slot];
  const slotName  = SLOT_NAME[slot];
  const catColor  = category ? CATEGORY_COLOR[category] : Colors.accent;

  const showEquipment = equipment && equipment !== 'none';
  const showSetup     = position || showEquipment;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Video placeholder */}
        <View style={styles.videoWrap}>
          <View style={[styles.videoTopBar, { backgroundColor: catColor }]} />
          <View style={[styles.videoBg, { backgroundColor: catColor, opacity: 0.06 }]} />
          <View style={styles.videoCenter}>
            <View style={styles.slotCircle}>
              <Text style={styles.slotCircleText}>{slotBadge}</Text>
            </View>
            <Text style={styles.videoHint}>Animation coming soon</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Meta chips */}
          <View style={styles.chipsRow}>
            {category && (
              <View style={[styles.chip, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
                <Text style={[styles.chipText, { color: catColor }]}>
                  {CATEGORY_LABEL[category]}
                </Text>
              </View>
            )}
            <View style={styles.chip}>
              <Ionicons name="time-outline" size={12} color={Colors.secondaryText} />
              <Text style={styles.chipText}>
                {exercise?.reps
                  ? `${exercise.reps} reps · ${exercise.sets ?? 1} sets`
                  : exercise?.sets
                    ? `${duration}s × ${exercise.sets}`
                    : `${duration}s`}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{slotName}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{name}</Text>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.sectionBody}>{description}</Text>
          </View>

          {/* Instructions */}
          {instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HOW TO DO IT</Text>
              {instructions.map((step, i) => (
                <View key={i} style={styles.step}>
                  <View style={[styles.stepNum, {
                    backgroundColor: catColor + '1A',
                    borderColor: catColor + '55',
                  }]}>
                    <Text style={[styles.stepNumText, { color: catColor }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Setup */}
          {showSetup && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SETUP</Text>
              {position && (
                <View style={styles.setupItem}>
                  <Ionicons name="body-outline" size={16} color={Colors.secondaryText} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.setupItemLabel}>Starting position</Text>
                    <Text style={styles.setupItemValue}>{formatLabel(position)}</Text>
                  </View>
                </View>
              )}
              {showEquipment && (
                <View style={styles.setupItem}>
                  <Ionicons name="cube-outline" size={16} color={Colors.secondaryText} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.setupItemLabel}>Equipment</Text>
                    <Text style={styles.setupItemValue}>{formatLabel(equipment!)}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.tight,
    paddingBottom: Spacing.inner,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  scroll: { paddingBottom: 60 },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  videoBg: {
    ...StyleSheet.absoluteFill,
  },
  videoCenter: {
    alignItems: 'center',
    gap: Spacing.tight,
  },
  slotCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCircleText: {
    ...Typography.subheadline,
    color: Colors.secondaryText,
    letterSpacing: 1,
  },
  videoHint: {
    ...Typography.caption,
    color: Colors.tertiaryText,
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.inner,
    gap: Spacing.section,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.tight,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.secondaryText,
  },
  title: {
    ...Typography.headline,
    marginTop: -Spacing.tight,
  },
  section: {
    gap: Spacing.tight,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  sectionBody: {
    ...Typography.body,
    color: Colors.secondaryText,
    lineHeight: 24,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.inner,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    ...Typography.label,
  },
  stepText: {
    ...Typography.body,
    color: Colors.secondaryText,
    flex: 1,
    lineHeight: 22,
  },
  setupItem: {
    flexDirection: 'row',
    gap: Spacing.inner,
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
  },
  setupItemLabel: {
    ...Typography.caption,
    color: Colors.tertiaryText,
  },
  setupItemValue: {
    ...Typography.bodyMedium,
    marginTop: 2,
  },
});
