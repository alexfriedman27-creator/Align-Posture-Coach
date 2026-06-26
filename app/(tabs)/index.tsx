import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, FlatList, Animated
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { Card } from '../../components/shared/Card';
import { SlotBadge } from '../../components/shared/SlotBadge';
import { Button } from '../../components/shared/Button';
import { useUserStore } from '../../lib/store/useUserStore';
import { useProgressStore } from '../../lib/store/useProgressStore';
import { usePlanStore } from '../../lib/store/usePlanStore';
import { moduleRepository } from '../../lib/data/ModuleRepository';
import { exerciseRepository } from '../../lib/data/ExerciseRepository';
import { ExerciseSlot, DAILY_SLOTS } from '../../types/Exercise';
import { xpProgress, xpForNextLevel } from '../../types/UserProgress';
import { Badge, CATEGORY_COLORS, getBadgeDefinition } from '../../types/Badge';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import { getBadges, getFavoriteModuleIds } from '../../lib/db/queries';
import { PostureModule } from '../../types/Module';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayTab() {
  const router = useRouter();
  const { profile } = useUserStore();
  const { progress } = useProgressStore();
  const { plan, loadOrGeneratePlan } = usePlanStore();
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [favoriteModules, setFavoriteModules] = useState<PostureModule[]>([]);

  const isPro = profile?.isPro ?? false;

  useEffect(() => {
    loadOrGeneratePlan();
  }, []);

  useFocusEffect(useCallback(() => {
    getBadges().then(setEarnedBadges);
    if (isPro) {
      getFavoriteModuleIds().then((ids) => {
        const modules = ids
          .map((id) => moduleRepository.module(id))
          .filter((m): m is PostureModule => m != null);
        setFavoriteModules(modules);
      });
    }
  }, [isPro]));

  const exercises = plan ? exerciseRepository.exercises(plan.exerciseIds) : [];
  const exerciseSlotSet = new Set(exercises.map((e) => e.slot));
  const slots = DAILY_SLOTS.filter((s) => exerciseSlotSet.has(s));
  const isCompleted = !!plan?.completedAt;
  const estMinutes = exercises.reduce((sum, e) => sum + Math.ceil(e.duration_seconds / 60), 0);

  const xpProg = progress ? xpProgress(progress) : 0;
  const isFirstSession = !profile?.onboardingCompleted;

  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isFirstSession) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 650, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isFirstSession]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting row */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingSub}>{getGreeting()},</Text>
            <Text style={styles.greetingName}>{profile?.name ?? 'there'}</Text>
          </View>
          <View style={styles.greetingRight}>
            <View style={styles.levelSection}>
              <Text style={styles.levelText}>LVL {progress?.level ?? 1}</Text>
              <View style={styles.xpBarSmall}>
                <View style={[styles.xpFillSmall, { width: `${Math.round(xpProg * 100)}%` }]} />
              </View>
            </View>
            <View style={styles.badgeSlotsRow}>
              {([1, 2, 3] as const).map((slot) => {
                const badge = earnedBadges.find((b) => b.isPinned === slot);
                const def = badge ? getBadgeDefinition(badge.id) : null;
                const color = def ? CATEGORY_COLORS[def.category] : Colors.accent;
                return badge ? (
                  <View key={slot} style={[styles.badgeSlotFilled, { backgroundColor: color + '22', borderColor: color }]}>
                    <Ionicons name={badge.iconName as IoniconsName} size={15} color={color} />
                  </View>
                ) : (
                  <View key={slot} style={styles.badgeSlotEmpty} />
                );
              })}
            </View>
          </View>
        </View>

        {/* Daily reset card */}
        <Animated.View style={[
          styles.tutorialGlow,
          isFirstSession && {
            borderColor: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['transparent', Colors.accent],
            }),
            transform: [{
              scale: pulseAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.018, 1],
              }),
            }],
          },
        ]}>
          <Card style={styles.resetCard}>
            <Text style={styles.resetLabel}>TODAY'S RESET</Text>
            <View style={styles.resetHeader}>
              <View style={styles.progressRingSmall}>
                <Text style={styles.progressPct}>{isCompleted ? '100%' : '0%'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resetTitle}>{estMinutes}-Minute Plan</Text>
                <Text style={styles.resetMeta}>{exercises.length} exercises · about {estMinutes} min</Text>
              </View>
            </View>

            <View style={styles.slotsRow}>
              {slots.slice(0, 5).map((slot, i) => (
                <SlotBadge key={i} slot={slot} filled={isCompleted} />
              ))}
            </View>

            {isFirstSession && !isCompleted && (
              <Text style={styles.tutorialHint}>Start here — complete your first session</Text>
            )}

            <Button
              label={isCompleted ? 'Completed' : 'Start session'}
              icon={isCompleted ? 'checkmark' : 'play'}
              onPress={() => {
                if (!isCompleted && plan) {
                  router.push({ pathname: '/session', params: { source: 'dailyPlan' } });
                }
              }}
              disabled={isCompleted}
              style={styles.startBtn}
            />
          </Card>
        </Animated.View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="flame" size={18} color={Colors.orange} />
              <Text style={styles.statLabel}> STREAK</Text>
            </View>
            <Text style={styles.statValue}>{progress?.streakDays ?? 0}</Text>
            <Text style={styles.statSub}>days in a row</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>LEVEL {progress?.level ?? 1}</Text>
              <Text style={[styles.statLabel, { color: Colors.accent, marginLeft: 4 }]}>
                {Math.round(xpProg * 100)}%
              </Text>
            </View>
            <Text style={styles.statValue}>{progress?.totalXP ?? 0}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.round(xpProg * 100)}%` }]} />
            </View>
            <Text style={styles.statSub}>/ {xpForNextLevel(progress?.level ?? 1)} XP</Text>
          </Card>
        </View>

        {isPro ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Favorite Programs</Text>
            </View>
            {favoriteModules.length > 0 ? (
              <FlatList
                horizontal
                data={favoriteModules}
                keyExtractor={(m) => m.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.tight, paddingRight: Spacing.card }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.programCard}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/session', params: { source: 'module', moduleId: item.id } })}
                  >
                    <View style={styles.programStripe} />
                    <Text style={styles.programCat}>{item.category.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.programName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.favEmptyCard}>
                <Ionicons name="star-outline" size={22} color={Colors.tertiaryText} />
                <Text style={styles.favEmptyText}>
                  Tap the star on any program in the Programs tab to save it here
                </Text>
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.paywallCard}
            activeOpacity={0.92}
            onPress={() => router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } })}
          >
            {/* Header row */}
            <View style={styles.paywallHeader}>
              <View style={styles.paywallIconWrap}>
                <Ionicons name="star" size={18} color="#F5C518" />
              </View>
              <View style={styles.paywallProBadge}>
                <Text style={styles.paywallProBadgeText}>PRO</Text>
              </View>
            </View>

            {/* Headline */}
            <Text style={styles.paywallHeadline}>Fix your posture,{'\n'}for good.</Text>
            <Text style={styles.paywallBody}>
              Unlock all 20 expert programs — from gentle beginner routines to advanced strength work — designed to address the exact patterns behind your neck pain, back tension, and fatigue.
            </Text>

            {/* Feature list */}
            {[
              '20 targeted programs, beginner to advanced',
              'Save favorites for your daily routine',
              'Build your own custom exercises',
              'Detailed progress tracking & streaks',
            ].map((f) => (
              <View key={f} style={styles.paywallFeatureRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
                <Text style={styles.paywallFeatureText}>{f}</Text>
              </View>
            ))}

            {/* CTA */}
            <View style={styles.paywallCta}>
              <Text style={styles.paywallCtaText}>Upgrade to Pro</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </View>

            <Text style={styles.paywallFooter}>Cancel anytime</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, paddingBottom: 120, gap: Spacing.gap, flexGrow: 1 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingSub: { ...Typography.body, color: Colors.secondaryText },
  greetingName: { ...Typography.display },
  greetingRight: { alignItems: 'flex-end', gap: Spacing.tight, marginTop: 4 },
  levelSection: { alignItems: 'flex-end', gap: 5 },
  levelText: { ...Typography.label, color: Colors.accent },
  xpBarSmall: {
    width: 72,
    height: 3,
    backgroundColor: Colors.cardElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpFillSmall: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  badgeSlotsRow: { flexDirection: 'row', gap: Spacing.micro },
  badgeSlotFilled: {
    width: 34,
    height: 34,
    borderRadius: Radii.icon,
    backgroundColor: Colors.accent + '22',
    borderColor: Colors.accent,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSlotEmpty: {
    width: 34,
    height: 34,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.card,
    borderWidth: 1,
  },
  tutorialGlow: {
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tutorialHint: {
    ...Typography.caption,
    color: Colors.accent,
    textAlign: 'center',
    marginTop: Spacing.micro,
  },
  resetCard: { gap: Spacing.inner },
  resetLabel: { ...Typography.label, color: Colors.accent, letterSpacing: 1, textTransform: 'uppercase' },
  resetHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.inner },
  progressRingSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: { ...Typography.label, color: Colors.primaryText },
  resetTitle: { ...Typography.subheadline },
  resetMeta: { ...Typography.caption, color: Colors.secondaryText, marginTop: 2 },
  slotsRow: { flexDirection: 'row', gap: Spacing.tight },
  startBtn: { marginTop: Spacing.micro },
  statsRow: { flexDirection: 'row', gap: Spacing.tight },
  statCard: { flex: 1, gap: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { ...Typography.caption, color: Colors.secondaryText, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { ...Typography.title },
  statSub: { ...Typography.caption, color: Colors.secondaryText },
  xpBar: { height: 4, backgroundColor: Colors.cardElevated, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  xpFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...Typography.subheadline },
  programCard: {
    width: 140,
    height: 140,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    overflow: 'hidden',
    padding: Spacing.inner,
    justifyContent: 'flex-end',
  },
  programStripe: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
    backgroundColor: Colors.cardElevated,
  },
  programCat: { ...Typography.caption, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 1 },
  programName: { ...Typography.label, color: Colors.primaryText, marginTop: 2 },
  favEmptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
  },
  favEmptyText: {
    ...Typography.body,
    color: Colors.tertiaryText,
    flex: 1,
    lineHeight: 20,
  },
  paywallCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.card,
    gap: Spacing.inner,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
  },
  paywallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.tight,
  },
  paywallIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radii.icon,
    backgroundColor: '#F5C51815',
    borderWidth: 1,
    borderColor: '#F5C51840',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallProBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 3,
  },
  paywallProBadgeText: { ...Typography.caption, color: Colors.white, fontFamily: 'Outfit-Bold', letterSpacing: 1 },
  paywallHeadline: { ...Typography.title, lineHeight: 34 },
  paywallBody: { ...Typography.body, color: Colors.secondaryText, lineHeight: 22 },
  paywallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.tight,
  },
  paywallFeatureText: { ...Typography.body, color: Colors.primaryText, flex: 1 },
  paywallCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.tight,
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    paddingVertical: 14,
    marginTop: Spacing.micro,
  },
  paywallCtaText: { ...Typography.bodyMedium, color: Colors.white },
  paywallFooter: { ...Typography.caption, color: Colors.tertiaryText, textAlign: 'center' },
});
