import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { moduleRepository } from '../lib/data/ModuleRepository';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { useUserStore } from '../lib/store/useUserStore';
import { getFavoriteModuleIds, addFavoriteModule, removeFavoriteModule } from '../lib/db/queries';
import {
  PostureModule, ModuleIntensity, INTENSITY_LABEL, MODULE_ICON,
} from '../types/Module';
import { Exercise, ExerciseCategory, SLOT_NAME } from '../types/Exercise';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const INTENSITY_COLOR: Record<ModuleIntensity, string> = {
  easy:     '#4EC97B',
  moderate: '#4EA8FF',
  hard:     '#FF7A33',
};

const INTENSITY_XP: Record<ModuleIntensity, number> = {
  easy:     200,
  moderate: 300,
  hard:     400,
};

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  stretch:    '#4EA8FF',
  strengthen: '#FF7A33',
  mobility:   '#4EC97B',
  awareness:  '#B57BFF',
};

function formatDuration(ex: Exercise): string {
  if (ex.reps) {
    return ex.sets && ex.sets > 1 ? `${ex.sets} × ${ex.reps} reps` : `${ex.reps} reps`;
  }
  return ex.sets && ex.sets > 1 ? `${ex.sets} × ${ex.duration_seconds}s` : `${ex.duration_seconds}s`;
}

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const { profile } = useUserStore();
  const isPro = profile?.isPro ?? false;
  const [isFavorite, setIsFavorite] = useState(false);

  const module = moduleId ? moduleRepository.module(moduleId) : undefined;

  useFocusEffect(useCallback(() => {
    if (!moduleId) return;
    getFavoriteModuleIds().then((ids) => setIsFavorite(ids.includes(moduleId)));
  }, [moduleId]));

  if (!module) return null;

  const resolved = moduleRepository.resolved(module);
  const color = INTENSITY_COLOR[module.intensity];
  const icon = (MODULE_ICON[module.id] ?? 'layers-outline') as IoniconsName;

  async function toggleFavorite() {
    if (isFavorite) {
      await removeFavoriteModule(module!.id);
      setIsFavorite(false);
    } else {
      await addFavoriteModule(module!.id);
      setIsFavorite(true);
    }
  }

  function handleStart() {
    if (!isPro) {
      router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } });
      return;
    }
    router.push({ pathname: '/session', params: { source: 'module', moduleId: module!.id } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.primaryText} />
        </TouchableOpacity>
        {isPro && (
          <TouchableOpacity onPress={toggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={isFavorite ? '#F5C518' : Colors.secondaryText}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
            <Ionicons name={icon} size={38} color={color} />
          </View>
          <Text style={styles.programName}>{module.name}</Text>
          <View style={styles.heroMeta}>
            <View style={[styles.intensityChip, { backgroundColor: color + '22', borderColor: color + '55' }]}>
              <Text style={[styles.intensityChipText, { color }]}>
                {INTENSITY_LABEL[module.intensity].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.metaText}>
              {module.exercise_ids.length} exercises · {module.est_minutes} min
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>{module.tagline}</Text>
          <Text style={styles.rationale}>{module.rationale}</Text>
        </View>

        {/* Exercise list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <View style={styles.exerciseList}>
            {resolved.exercises.map((ex, i) => (
              <TouchableOpacity
                key={ex.id}
                style={styles.exerciseRow}
                onPress={() => router.push({ pathname: '/exercise-detail', params: { id: ex.id, kind: 'builtin' } })}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLOR[ex.category] }]} />
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseSlot}>{SLOT_NAME[ex.slot]}</Text>
                  </View>
                </View>
                <View style={styles.exerciseRight}>
                  <Text style={styles.exerciseDuration}>{formatDuration(ex)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.tertiaryText} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* XP preview */}
        {isPro && (
          <View style={styles.xpCard}>
            <View style={styles.xpLeft}>
              <View style={[styles.xpIconWrap, { backgroundColor: color + '18', borderColor: color + '30' }]}>
                <Ionicons name="flash" size={18} color={color} />
              </View>
              <View>
                <Text style={styles.xpAmount}>{INTENSITY_XP[module.intensity]} XP</Text>
                <Text style={styles.xpSub}>earned on completion</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>
            {isPro ? 'Start Program' : 'Unlock to Start'}
          </Text>
          {!isPro && <Ionicons name="lock-closed" size={15} color={Colors.white} style={{ marginLeft: 6 }} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.card,
    paddingVertical: Spacing.inner,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingBottom: 32, gap: Spacing.gap },

  hero: { alignItems: 'center', gap: Spacing.tight, paddingTop: Spacing.inner },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  programName: { ...Typography.title, textAlign: 'center' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight, marginTop: 2 },
  intensityChip: {
    borderRadius: Radii.chip, borderWidth: 1,
    paddingHorizontal: Spacing.tight, paddingVertical: 3,
  },
  intensityChipText: { ...Typography.caption, fontFamily: 'Outfit-Bold', letterSpacing: 0.8 },
  metaText: { ...Typography.caption, color: Colors.secondaryText },

  section: { gap: Spacing.tight },
  description: { ...Typography.subheadline, color: Colors.primaryText },
  rationale: { ...Typography.body, color: Colors.secondaryText, lineHeight: 22 },
  sectionTitle: { ...Typography.subheadline, marginBottom: 4 },

  exerciseList: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.inner,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardElevated,
  },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.inner, flex: 1 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...Typography.bodyMedium },
  exerciseSlot: { ...Typography.caption, color: Colors.secondaryText, marginTop: 1 },
  exerciseRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  exerciseDuration: { ...Typography.caption, color: Colors.secondaryText },

  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
  },
  xpLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.inner },
  xpIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  xpAmount: { ...Typography.subheadline, color: Colors.primaryText },
  xpSub: { ...Typography.caption, color: Colors.secondaryText, marginTop: 1 },

  footer: {
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.card,
    paddingTop: Spacing.inner,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardElevated,
  },
  startBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  startBtnText: { ...Typography.bodyMedium, color: Colors.white },
});
