import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography, FontFamily } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { usePlanStore } from '../lib/store/usePlanStore';
import { useProgressStore } from '../lib/store/useProgressStore';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { Exercise, ExerciseCategory, SLOT_NAME, SLOT_BADGE } from '../types/Exercise';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  stretch:    '#4EA8FF',
  strengthen: '#FF7A33',
  mobility:   '#4EC97B',
  awareness:  '#B57BFF',
};

const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  stretch:    'Stretch',
  strengthen: 'Strength',
  mobility:   'Mobility',
  awareness:  'Practice',
};

function formatDuration(ex: Exercise): string {
  if (ex.reps) {
    return ex.sets && ex.sets > 1 ? `${ex.sets} × ${ex.reps} reps` : `${ex.reps} reps`;
  }
  return ex.sets && ex.sets > 1 ? `${ex.sets} × ${ex.duration_seconds}s` : `${ex.duration_seconds}s`;
}

function getMotivation(streakDays: number): string {
  if (streakDays === 0) return 'Start your streak today.';
  if (streakDays === 1) return "Nice start. Let's make it two.";
  if (streakDays < 7) return `${streakDays} days in a row. Keep it going.`;
  if (streakDays < 30) return `${streakDays}-day streak. You're building something real.`;
  return `${streakDays} days strong. That's incredible.`;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'A fresh start to your morning.';
  if (h < 17) return 'A midday reset. You got this.';
  return 'Wind down and restore.';
}

export default function DailyPlanScreen() {
  const router = useRouter();
  const { plan, loadOrGeneratePlan } = usePlanStore();
  const { progress } = useProgressStore();

  useFocusEffect(useCallback(() => {
    loadOrGeneratePlan();
  }, []));

  const exercises = plan ? exerciseRepository.exercises(plan.exerciseIds) : [];
  const isCompleted = !!plan?.completedAt;
  const estMinutes = exercises.reduce((sum, e) => sum + Math.ceil(e.duration_seconds / 60), 0);
  const streakDays = progress?.streakDays ?? 0;
  const expectedStreak = (() => {
    if (isCompleted) return streakDays;
    const last = progress?.lastSessionDate;
    if (!last) return 1;
    const diffDays = Math.round((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return streakDays + 1;
    if (diffDays === 0) return streakDays;
    return 1;
  })();
  const streakBonus = expectedStreak * 50;
  const totalXP = isCompleted && plan?.xpEarned ? plan.xpEarned : 500 + streakBonus;

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const motivation = streakDays > 0 ? getMotivation(streakDays) : getTimeGreeting();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Program</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.dateStr}>{dateStr}</Text>
          <Text style={styles.motivation}>{motivation}</Text>

          {/* Body area coverage */}
          <View style={styles.slotRow}>
            {exercises.map((ex, i) => {
              const color = CATEGORY_COLOR[ex.category];
              return (
                <View key={i} style={styles.slotItem}>
                  <View style={[styles.slotCircle, { backgroundColor: color + '1A', borderColor: color + '55' }]}>
                    <Text style={[styles.slotAbbr, { color }]}>{SLOT_BADGE[ex.slot]}</Text>
                  </View>
                  <Text style={styles.slotLabel} numberOfLines={1} allowFontScaling={false}>
                    {SLOT_NAME[ex.slot]}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.metaText}>{exercises.length} exercises · ~{estMinutes} min</Text>
        </View>

        {/* Exercise list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you'll do</Text>
          <View style={styles.exerciseList}>
            {exercises.map((ex, i) => {
              const color = CATEGORY_COLOR[ex.category];
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseRow, i < exercises.length - 1 && styles.exerciseRowBorder]}
                  onPress={() => router.push({ pathname: '/exercise-detail', params: { id: ex.id, kind: 'builtin' } })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.indexBadge, { backgroundColor: color + '1A' }]}>
                    <Text style={[styles.indexText, { color }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <View style={styles.exerciseMeta}>
                      <Text style={styles.exerciseSlot}>{SLOT_NAME[ex.slot]}</Text>
                      <View style={styles.metaDot} />
                      <View style={[styles.categoryChip, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.categoryChipText, { color }]} allowFontScaling={false}>
                          {CATEGORY_LABEL[ex.category]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.exerciseRight}>
                    <Text style={styles.exerciseDuration}>{formatDuration(ex)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.tertiaryText} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* XP preview */}
        {!isCompleted && (
          <View style={styles.xpCard}>
            <View style={styles.xpLeft}>
              <View style={styles.xpIconWrap}>
                <Ionicons name="flash" size={18} color="#F5C518" />
              </View>
              <View>
                <Text style={styles.xpAmount}>{totalXP} XP</Text>
                <Text style={styles.xpSub}>
                  {streakBonus > 0 ? `500 base + ${streakBonus} streak bonus` : 'earned on completion'}
                </Text>
              </View>
            </View>
            {streakDays > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={13} color={Colors.orange} />
                <Text style={styles.streakText}>{streakDays}d streak</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {isCompleted ? (
          <View style={styles.completedRow}>
            <Ionicons name="checkmark-circle" size={22} color="#4EC97B" />
            <Text style={styles.completedText}>Completed today</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push({ pathname: '/session', params: { source: 'dailyPlan' } })}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={17} color={Colors.white} />
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.card,
    paddingVertical: Spacing.inner,
  },
  headerTitle: { ...Typography.bodyMedium, color: Colors.secondaryText },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingBottom: 32, gap: Spacing.gap },

  hero: { alignItems: 'center', paddingTop: Spacing.tight, gap: Spacing.tight },
  dayName: { ...Typography.display, textAlign: 'center' },
  dateStr: { ...Typography.subheadline, color: Colors.secondaryText, marginTop: -4 },
  motivation: { ...Typography.body, fontSize: 17, lineHeight: 24, color: Colors.tertiaryText, marginTop: 2 },

  slotRow: {
    flexDirection: 'row',
    gap: Spacing.tight,
    marginTop: Spacing.inner,
    marginBottom: Spacing.micro,
  },
  slotItem: { alignItems: 'center', gap: 6, width: 58 },
  slotCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotAbbr: { ...Typography.label, fontFamily: FontFamily.poppinsBold, fontSize: 15, lineHeight: 20 },
  slotLabel: { ...Typography.caption, color: Colors.secondaryText, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  metaText: { ...Typography.body, fontSize: 17, lineHeight: 24, color: Colors.secondaryText },

  section: { gap: Spacing.tight },
  sectionTitle: { ...Typography.subheadline },

  exerciseList: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.inner,
    paddingVertical: 14,
    gap: Spacing.inner,
  },
  exerciseRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardElevated,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  indexText: { ...Typography.label, fontSize: 14, lineHeight: 18 },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...Typography.bodyMedium, fontSize: 17, lineHeight: 24 },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  exerciseSlot: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.tertiaryText },
  categoryChip: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  categoryChipText: { ...Typography.caption, fontSize: 12, lineHeight: 16, fontFamily: FontFamily.poppinsMedium },
  exerciseRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  exerciseDuration: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },

  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    borderWidth: 1,
    borderColor: '#F5C51820',
  },
  xpLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.inner },
  xpIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5C51815',
    borderWidth: 1,
    borderColor: '#F5C51830',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpAmount: { ...Typography.subheadline, color: Colors.primaryText },
  xpSub: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, marginTop: 1 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.orange + '18',
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 5,
  },
  streakText: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.orange, fontFamily: FontFamily.poppinsMedium },

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { fontFamily: FontFamily.poppinsExtraBold, fontSize: 22, lineHeight: 28, color: Colors.white, letterSpacing: 0.3 },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.tight,
    paddingVertical: 16,
  },
  completedText: { ...Typography.bodyMedium, color: '#4EC97B' },
});
