import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography, FontFamily } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { Exercise, ExerciseCategory, SLOT_NAME } from '../types/Exercise';
import { CustomProgram } from '../types/CustomProgram';
import {
  getCustomProgram, deleteCustomProgram,
  getFavoriteModuleIds, addFavoriteModule, removeFavoriteModule,
} from '../lib/db/queries';
import { resolveExerciseIds } from '../lib/utils/resolveExercises';
import { useUserStore } from '../lib/store/useUserStore';

const CUSTOM_PURPLE = '#B57BFF';

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

function isCustomId(id: string) { return id.startsWith('custom_'); }

export default function CustomProgramDetailScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { profile } = useUserStore();
  const isPro = profile?.isPro ?? false;

  const [program, setProgram] = useState<CustomProgram | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!programId) return;
    (async () => {
      const [prog, favIds] = await Promise.all([
        getCustomProgram(programId),
        getFavoriteModuleIds(),
      ]);
      setProgram(prog);
      setIsFavorite(favIds.includes(programId));
      if (prog) {
        const resolved = await resolveExerciseIds(prog.exerciseIds);
        setExercises(resolved);
      }
    })();
  }, [programId]));

  async function toggleFavorite() {
    if (!programId) return;
    if (isFavorite) {
      await removeFavoriteModule(programId);
      setIsFavorite(false);
    } else {
      await addFavoriteModule(programId);
      setIsFavorite(true);
    }
  }

  function handleEdit() {
    router.push({ pathname: '/create-program', params: { editId: programId } });
  }

  function handleDelete() {
    Alert.alert(
      'Delete Program',
      `Delete "${program?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!programId) return;
            await deleteCustomProgram(programId);
            await removeFavoriteModule(programId);
            router.back();
          },
        },
      ]
    );
  }

  function handleStart() {
    if (!isPro) {
      router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } });
      return;
    }
    router.push({ pathname: '/session', params: { source: 'customProgram', customProgramId: programId } });
  }

  const estMinutes = exercises.reduce((sum, e) => sum + Math.ceil(e.duration_seconds / 60), 0);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={isFavorite ? '#F5C518' : Colors.secondaryText}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="pencil-outline" size={20} color={Colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={20} color={Colors.secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="color-wand" size={38} color={CUSTOM_PURPLE} />
          </View>
          <Text style={styles.programName}>{program?.name ?? ''}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.customChip}>
              <Text style={styles.customChipText}>CUSTOM</Text>
            </View>
            <Text style={styles.metaText}>
              {exercises.length} exercises · {estMinutes} min
            </Text>
          </View>
        </View>

        {/* Exercise list */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <View style={styles.exerciseList}>
              {exercises.map((ex, i) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseRow, i < exercises.length - 1 && styles.exerciseRowBorder]}
                  onPress={() => {
                    const kind = isCustomId(ex.id) ? 'custom' : 'builtin';
                    router.push({ pathname: '/exercise-detail', params: { id: ex.id, kind } });
                  }}
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
        )}

        {/* XP card */}
        {isPro && (
          <View style={styles.xpCard}>
            <View style={styles.xpLeft}>
              <View style={styles.xpIconWrap}>
                <Ionicons name="flash" size={18} color={CUSTOM_PURPLE} />
              </View>
              <View>
                <Text style={styles.xpAmount}>300 XP</Text>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.gap },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingBottom: 32, gap: Spacing.gap },

  hero: { alignItems: 'center', gap: Spacing.tight, paddingTop: Spacing.inner },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: CUSTOM_PURPLE + '22',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  programName: { ...Typography.title, textAlign: 'center' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight, marginTop: 2 },
  customChip: {
    borderRadius: Radii.chip,
    borderWidth: 1,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 3,
    backgroundColor: CUSTOM_PURPLE + '22',
    borderColor: CUSTOM_PURPLE + '55',
  },
  customChipText: {
    fontFamily: FontFamily.poppinsBold,
    fontSize: 13,
    lineHeight: 18,
    color: CUSTOM_PURPLE,
    letterSpacing: 0.8,
  },
  metaText: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },

  section: { gap: Spacing.tight },
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
  },
  exerciseRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardElevated,
  },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.inner, flex: 1 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...Typography.bodyMedium },
  exerciseSlot: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, marginTop: 1 },
  exerciseRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  exerciseDuration: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },

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
    backgroundColor: CUSTOM_PURPLE + '18',
    borderWidth: 1, borderColor: CUSTOM_PURPLE + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  xpAmount: { ...Typography.subheadline, color: Colors.primaryText },
  xpSub: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, marginTop: 1 },

  footer: {
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.card,
    paddingTop: Spacing.inner,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardElevated,
  },
  startBtn: {
    backgroundColor: CUSTOM_PURPLE,
    borderRadius: Radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  startBtnText: { fontFamily: FontFamily.poppinsExtraBold, fontSize: 22, lineHeight: 28, color: Colors.white, letterSpacing: 0.3 },
});
