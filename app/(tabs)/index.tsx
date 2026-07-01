import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, FlatList, Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography, FontFamily } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { Card } from '../../components/shared/Card';
import { useUserStore } from '../../lib/store/useUserStore';
import { useProgressStore } from '../../lib/store/useProgressStore';
import { usePlanStore } from '../../lib/store/usePlanStore';
import { moduleRepository } from '../../lib/data/ModuleRepository';
import { exerciseRepository } from '../../lib/data/ExerciseRepository';
import { ExerciseCategory } from '../../types/Exercise';
import { xpProgress, xpForLevel, xpForNextLevel } from '../../types/UserProgress';
import { Badge, CATEGORY_COLORS, getBadgeDefinition } from '../../types/Badge';
import { getBadges, getFavoriteModuleIds, getCustomPrograms } from '../../lib/db/queries';
import { PostureModule, ModuleIntensity, MODULE_ICON } from '../../types/Module';
import { CustomProgram } from '../../types/CustomProgram';

const INTENSITY_COLOR: Record<ModuleIntensity, string> = {
  easy: Colors.success,
  moderate: Colors.info,
  hard: Colors.streak,
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type FavItem = PostureModule | CustomProgram | { type: 'add' };

const _MS = 0.44;
const _WIDTHS = [38, 31, 24, 18];
const _HEAD_R = 13;
const _SEG_H = 15;
const _SEG_GAP = 6;
const _SEG_RX = 6.5;
const _NECK_GAP = 7;
const _stackH = _WIDTHS.length * _SEG_H + (_WIDTHS.length - 1) * _SEG_GAP;
const _totalH = _HEAD_R * 2 + _NECK_GAP + _stackH;
const _topOff = (140 - _totalH) / 2;
const _headCy = _topOff + _HEAD_R;
const _firstCy = _topOff + _HEAD_R * 2 + _NECK_GAP + _SEG_H / 2;

function AlignMark() {
  return (
    <View style={{ width: 100 * _MS, height: 140 * _MS }}>
      <View style={{
        position: 'absolute',
        left: (50 - _HEAD_R) * _MS,
        top: (_headCy - _HEAD_R) * _MS,
        width: _HEAD_R * 2 * _MS,
        height: _HEAD_R * 2 * _MS,
        borderRadius: _HEAD_R * _MS,
        backgroundColor: Colors.infoMuted,
      }} />
      {_WIDTHS.map((w, i) => {
        const cy = _firstCy + i * (_SEG_H + _SEG_GAP);
        return (
          <View key={i} style={{
            position: 'absolute',
            left: (50 - w / 2) * _MS,
            top: (cy - _SEG_H / 2) * _MS,
            width: w * _MS,
            height: _SEG_H * _MS,
            borderRadius: _SEG_RX * _MS,
            backgroundColor: Colors.accent,
          }} />
        );
      })}
    </View>
  );
}

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  stretch:    Colors.info,
  strengthen: Colors.streak,
  mobility:   Colors.success,
  awareness:  Colors.custom,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStreakLine(streakDays: number): string {
  if (streakDays === 0) return 'Start your streak today';
  if (streakDays === 1) return '1 day in · keep it going';
  if (streakDays < 7) return `${streakDays} days in a row`;
  if (streakDays < 30) return `${streakDays}-day streak`;
  return `${streakDays} days strong`;
}

export default function TodayTab() {
  const router = useRouter();
  const { profile } = useUserStore();
  const { progress } = useProgressStore();
  const { plan, loadOrGeneratePlan } = usePlanStore();
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [favoriteModules, setFavoriteModules] = useState<(PostureModule | CustomProgram)[]>([]);

  const isPro = profile?.isPro ?? false;
  const streakDays = progress?.streakDays ?? 0;
  const xpProg = progress ? xpProgress(progress) : 0;
  const isFirstSession = !profile?.onboardingCompleted;

  useEffect(() => { loadOrGeneratePlan(); }, []);

  useFocusEffect(useCallback(() => {
    getBadges().then(setEarnedBadges);
    if (isPro) {
      Promise.all([getFavoriteModuleIds(), getCustomPrograms()]).then(([ids, customProgs]) => {
        const customById = new Map(customProgs.map((p) => [p.id, p]));
        const items = ids
          .map((id) => moduleRepository.module(id) ?? customById.get(id))
          .filter((item): item is PostureModule | CustomProgram => item != null);
        setFavoriteModules(items);
      });
    }
  }, [isPro]));

  const exercises = plan ? exerciseRepository.exercises(plan.exerciseIds) : [];
  const isCompleted = !!plan?.completedAt;
  const estMinutes = exercises.reduce((sum, e) => sum + Math.ceil(e.duration_seconds / 60), 0);

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isCompleted) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCompleted]);

  const favItems: FavItem[] = [
    ...favoriteModules,
    { type: 'add' },
    { type: 'add' },
    { type: 'add' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingSub}>{getGreeting()},</Text>
            <Text style={styles.greetingName}>{profile?.name ?? 'there'}</Text>
          </View>
          <View style={styles.greetingRight}>
            <View style={styles.badgeSlotsRow}>
              {([1, 2, 3] as const).map((slot) => {
                const badge = earnedBadges.find((b) => b.isPinned === slot);
                const def = badge ? getBadgeDefinition(badge.id) : null;
                const color = def ? (def.color ?? CATEGORY_COLORS[def.category]) : Colors.accent;
                return badge ? (
                  <View key={slot} style={[styles.badgeSlotFilled, { backgroundColor: color + '22', borderColor: color }]}>
                    <Ionicons name={badge.iconName as IoniconsName} size={19} color={color} />
                    {(def?.stars ?? 0) > 0 && (
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {Array.from({ length: def!.stars! }, (_, i) => (
                          <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View key={slot} style={styles.badgeSlotEmpty} />
                );
              })}
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.settingsBtn}
              >
                <Ionicons name="settings-outline" size={20} color={Colors.tertiaryText} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero daily program card */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => router.push('/daily-plan')}>
          <Animated.View style={[
            styles.heroWrap,
            !isCompleted && {
              borderColor: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['transparent', Colors.accent],
              }),
            },
          ]}>
            <View style={styles.heroCard}>

              {/* Top row: label + date */}
              <View style={styles.heroTopRow}>
                <Text style={styles.heroLabel}>DAILY PROGRAM</Text>
                <Text style={styles.heroDateStr}>{dateStr}</Text>
              </View>

              {/* Day name + streak */}
              <View style={styles.heroDateBlock}>
                <Text style={styles.heroDayName}>{dayName}</Text>
                <View style={styles.streakRow}>
                  <Ionicons
                    name={streakDays > 0 ? 'flame' : 'flame-outline'}
                    size={13}
                    color={streakDays > 0 ? Colors.orange : Colors.tertiaryText}
                  />
                  <Text style={[
                    styles.streakLine,
                    { color: streakDays > 0 ? Colors.orange : Colors.tertiaryText },
                  ]}>
                    {getStreakLine(streakDays)}
                  </Text>
                </View>
              </View>

              {/* Vertical exercise list */}
              <View style={styles.exerciseList}>
                {exercises.map((ex, i) => {
                  const c = CATEGORY_COLOR[ex.category];
                  const dur = ex.reps
                    ? (ex.sets && ex.sets > 1 ? `${ex.sets} × ${ex.reps} reps` : `${ex.reps} reps`)
                    : (ex.sets && ex.sets > 1 ? `${ex.sets} × ${ex.duration_seconds}s` : `${ex.duration_seconds}s`);
                  return (
                    <View key={i}>
                      {i > 0 && <View style={styles.exerciseDivider} />}
                      <View style={styles.exerciseRow}>
                        <View style={[styles.exerciseDot, { backgroundColor: c }]} />
                        <View style={styles.exerciseText}>
                          <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                        </View>
                        <Text style={styles.exerciseDur} allowFontScaling={false}>{dur}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Footer: meta + CTA */}
              <View style={styles.heroFooter}>
                <Text style={styles.heroMeta}>
                  {exercises.length} exercises · ~{estMinutes} min
                </Text>

                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.completedText}>Done for today</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.sessionBtn}
                    onPress={() => router.push({ pathname: '/session', params: { source: 'dailyPlan' } })}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="play" size={14} color={Colors.white} />
                    <Text style={styles.sessionBtnText}>Start</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isFirstSession && !isCompleted && (
                <Text style={styles.tutorialHint}>Tap to preview what's in store</Text>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <Ionicons name="flame" size={14} color={Colors.orange} />
              <Text style={styles.statLabel}> STREAK</Text>
            </View>
            <Text style={styles.statValue}>{streakDays}</Text>
            <Text style={styles.statSub}>days in a row</Text>
            <Text style={styles.statRecord}>Best: {progress?.longestStreak ?? 0} days</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>LEVEL {progress?.level ?? 1}</Text>
              <Text style={[styles.statLabel, { color: Colors.accent, marginLeft: 4 }]}>
                {Math.round(xpProg * 100)}%
              </Text>
            </View>
            <Text style={styles.statValue}>{progress ? progress.totalXP - xpForLevel(progress.level) : 0}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.round(xpProg * 100)}%` }]} />
            </View>
            <Text style={styles.statSub}>/ {progress ? xpForNextLevel(progress.level) - xpForLevel(progress.level) : 200} XP</Text>
          </Card>
        </View>

        {/* Favorites / upgrade */}
        {isPro ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorite Programs</Text>
            </View>
            <FlatList
              horizontal
              data={favItems}
              keyExtractor={(item, i) => ('id' in item ? item.id : `add-${i}`)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.tight, paddingRight: Spacing.card }}
              renderItem={({ item }) => {
                if ('type' in item) {
                  return (
                    <TouchableOpacity
                      style={styles.programCardAdd}
                      activeOpacity={0.7}
                      onPress={() => router.push('/(tabs)/modules')}
                    >
                      <Ionicons name="add" size={22} color={Colors.tertiaryText} />
                    </TouchableOpacity>
                  );
                }
                const isCustom = !('intensity' in item);
                if (isCustom) {
                  return (
                    <TouchableOpacity
                      style={styles.programCard}
                      activeOpacity={0.8}
                      onPress={() => router.push({ pathname: '/custom-program-detail', params: { programId: item.id } })}
                    >
                      <View style={styles.programStripe} />
                      <View style={[styles.programIconCircle, { backgroundColor: Colors.custom + '22' }]}>
                        <Ionicons name="color-wand" size={16} color={Colors.custom} />
                      </View>
                      <View>
                        <Text style={styles.programCat}>CUSTOM</Text>
                        <Text style={styles.programName}>{item.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    style={styles.programCard}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/program-detail', params: { moduleId: item.id } })}
                  >
                    <View style={styles.programStripe} />
                    <View style={[styles.programIconCircle, { backgroundColor: INTENSITY_COLOR[item.intensity] + '22' }]}>
                      <Ionicons name={(MODULE_ICON[item.id] ?? 'layers-outline') as any} size={16} color={INTENSITY_COLOR[item.intensity]} />
                    </View>
                    <View>
                      <Text style={styles.programCat}>{item.category.replace(/_/g, ' ').toUpperCase()}</Text>
                      <Text style={styles.programName}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        ) : (
          <TouchableOpacity
            style={styles.upgradeCard}
            activeOpacity={0.92}
            onPress={() => router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } })}
          >
            {/* Top: logo + PRO left, headline right */}
            <View style={styles.upgradeHeader}>
              <View style={styles.upgradeLogoCol}>
                <AlignMark />
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.upgradeHeadline}>{'Fix your posture,\nfor good.'}</Text>
            </View>

            <Text style={styles.upgradeBody}>
              Your posture says a lot about you before you ever open your mouth. Fix it.
            </Text>

            <View style={styles.upgradeCta}>
              <Text style={styles.upgradeCtaText}>Unlock Align Pro</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </View>
            <Text style={styles.upgradeFooter}>$6.99/mo or $39.99/yr · Cancel anytime</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.inner,
    paddingBottom: Spacing.card,
    gap: Spacing.gap,
    flexGrow: 1,
  },

  // Greeting
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingSub: { ...Typography.bodyLg, color: Colors.secondaryText },
  greetingName: { ...Typography.display },
  greetingRight: { alignItems: 'flex-end', marginTop: 4 },
  badgeSlotsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight },
  settingsBtn: { paddingLeft: 2 },
  badgeSlotFilled: {
    width: 44, height: 44, borderRadius: Radii.icon,
    backgroundColor: Colors.accent + '22', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeSlotEmpty: {
    width: 44, height: 44, borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated, borderColor: Colors.cardElevated, borderWidth: 1,
  },

  // Hero card
  heroWrap: {
    borderRadius: Radii.card + 2,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    gap: Spacing.tight + 2,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: { ...Typography.labelLg, color: Colors.accent, letterSpacing: 1.5 },
  heroDateStr: { ...Typography.captionLg, color: Colors.tertiaryText },
  heroDateBlock: { gap: 6 },
  heroDayName: {
    fontFamily: FontFamily.poppinsExtraBold,
    fontSize: 40,
    lineHeight: 46,
    color: Colors.primaryText,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakLine: { ...Typography.body, fontSize: 16, lineHeight: 22 },

  exerciseList: {},
  exerciseDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.cardElevated },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight, paddingVertical: 5 },
  exerciseDot: { width: 6, height: 6, borderRadius: 3 },
  exerciseText: { flex: 1 },
  exerciseName: { ...Typography.label, fontSize: 15, lineHeight: 20, color: Colors.primaryText },
  exerciseDur: { ...Typography.captionLg, color: Colors.tertiaryText },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.micro,
  },
  heroMeta: { ...Typography.bodyLg, color: Colors.secondaryText },
  sessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 10,
  },
  sessionBtnText: { ...Typography.bodyMedium, color: Colors.white },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedText: { ...Typography.bodyMedium, color: Colors.success },
  tutorialHint: { ...Typography.captionLg, color: Colors.accent, textAlign: 'center', marginTop: -4 },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.tight },
  statCard: { flex: 1, gap: 4 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { ...Typography.captionLg, color: Colors.secondaryText, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { ...Typography.title },
  statSub: { ...Typography.captionLg, color: Colors.secondaryText },
  statRecord: { ...Typography.captionLg, color: Colors.tertiaryText, marginTop: 2 },
  xpBar: { height: 4, backgroundColor: Colors.cardElevated, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  xpFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },

  // Favorites
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...Typography.subheadline },
  programCard: {
    width: 134, height: 112, backgroundColor: Colors.card,
    borderRadius: Radii.card, overflow: 'hidden',
    padding: Spacing.inner, justifyContent: 'space-between',
  },
  programCardAdd: {
    width: 134, height: 112, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.cardElevated,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  programStripe: { ...StyleSheet.absoluteFill, opacity: 0.15, backgroundColor: Colors.cardElevated },
  programIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  programCat: { ...Typography.captionLg, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.8 },
  programName: { ...Typography.labelLg, color: Colors.primaryText, marginTop: 2 },
  // Upgrade card
  upgradeCard: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    padding: Spacing.card, gap: Spacing.inner,
    borderWidth: 1, borderColor: Colors.cardElevated,
  },
  upgradeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.inner },
  upgradeLogoCol: { alignItems: 'flex-start', gap: Spacing.tight },
  proBadge: {
    backgroundColor: Colors.accent, borderRadius: Radii.chip,
    paddingHorizontal: Spacing.inner, paddingVertical: 5,
  },
  proBadgeText: { ...Typography.bodyMedium, color: Colors.white, fontFamily: FontFamily.poppinsBold, letterSpacing: 1 },
  upgradeHeadline: { ...Typography.title, lineHeight: 32, flex: 1 },
  upgradeBody: { ...Typography.bodyLg, lineHeight: 26, color: Colors.secondaryText },
  upgradeCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.tight, backgroundColor: Colors.accent,
    borderRadius: Radii.card, paddingVertical: 14, marginTop: Spacing.micro,
  },
  upgradeCtaText: { fontFamily: FontFamily.poppinsExtraBold, fontSize: 22, lineHeight: 28, color: Colors.white, letterSpacing: 0.3 },
  upgradeFooter: { ...Typography.captionLg, color: Colors.tertiaryText, textAlign: 'center' },
});
