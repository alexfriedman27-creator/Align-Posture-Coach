import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Animated, Modal, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography, FontFamily } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { ProgressRing } from '../components/session/ProgressRing';
import { BadgeReveal } from '../components/session/BadgeReveal';
import { Button } from '../components/shared/Button';
import { ExerciseAnimation } from '../components/shared/ExerciseAnimation';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { moduleRepository } from '../lib/data/ModuleRepository';
import { useUserStore } from '../lib/store/useUserStore';
import { useProgressStore } from '../lib/store/useProgressStore';
import { usePlanStore } from '../lib/store/usePlanStore';
import { persistSessionCompletion, SessionSource } from '../lib/services/SessionManager';
import { getCustomProgram } from '../lib/db/queries';
import { resolveExerciseIds } from '../lib/utils/resolveExercises';
import { Exercise, SLOT_NAME } from '../types/Exercise';
import { xpProgress, xpForLevel, xpForNextLevel, UserProgress } from '../types/UserProgress';
import { Badge } from '../types/Badge';
import { MODULE_ICON } from '../types/Module';

type SessionState = 'preview' | 'exercise' | 'complete';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const COMPLETE_TITLES = [
  (name: string) => `Nicely done, ${name}.`,
  (name: string) => `That's what it's about, ${name}.`,
  (name: string) => `You showed up, ${name}.`,
  (name: string) => `Crushed it, ${name}.`,
  (name: string) => `Look at you go, ${name}.`,
  (name: string) => `${name}, you're on a roll.`,
  (name: string) => `Way to show up, ${name}.`,
  (name: string) => `${name}, that's a win.`,
  (name: string) => `Killing it, ${name}.`,
  (name: string) => `${name}, your future self thanks you.`,
  (name: string) => `That felt good, didn't it, ${name}?`,
  (name: string) => `${name}, you just leveled up your posture.`,
  (name: string) => `Making it happen, ${name}.`,
  (_name: string) => `Another one in the books.`,
  (_name: string) => `Session complete. Body happy.`,
  (_name: string) => `That's the habit being built.`,
  (_name: string) => `Consistency is the whole game.`,
  (_name: string) => `Ten minutes that matter.`,
];

const MODULE_COMPLETE_MESSAGE: Record<string, string> = {
  morning_unlock:        'Great way to start the day. Your body is ready to move.',
  desk_break_reset:      "That's what your desk didn't want you to do. Do it again tomorrow.",
  bedtime_release:       'Your body is ready for deep, restful sleep.',
  tech_neck_fix:         "Your neck just breathed a sigh of relief. Screen time can't touch you.",
  shoulder_unrounding:   "Chest open, shoulders back. That's what standing tall feels like.",
  upper_back_kyphosis:   'Your upper back is standing at attention. Keep stacking sessions.',
  lower_back_core:       'A stronger core is a better back. You just invested in both.',
  hip_flexor_reset:      'Your hips are unlocked. Walking, sitting — everything feels better.',
  gamer_reset:           'Battle-ready posture restored. You earned that next session.',
  full_body_alignment:   "Head to toe, you're dialed in. That's full-body work.",
  seated_neck_relief:    'The tension you carried into this session is gone. Nice work.',
  chest_and_spine_open:  'Chest open, spine long. You just created more space to breathe.',
  rotation_flow:         'You moved your spine in every direction a desk makes it forget. That is mobility.',
  glute_activation:      'Glutes switched on. Your lower back will thank you for this.',
  shoulder_stability:    'Shoulders locked in and stable. That foundation builds one session at a time.',
  prone_shoulder_series: "The muscles between your shoulder blades are awake. That's the good kind.",
  lateral_chain:         'Side body strength is often forgotten. You just made yours harder to ignore.',
  deep_neck_protocol:    "That's precision work. Your deep neck muscles are the real MVP.",
  dynamic_core:          'Your core is more ready than it was ten minutes ago. That compounds.',
  balance_training:      'Balance is a skill. You just practiced it.',
};

const CATEGORY_COLOR: Record<string, string> = {
  stretch: '#4EA8FF',
  strengthen: '#FF7A33',
  mobility: '#4EC97B',
  awareness: '#B57BFF',
};

const CATEGORY_LABEL: Record<string, string> = {
  stretch: 'Stretch',
  strengthen: 'Strengthen',
  mobility: 'Mobility',
  awareness: 'Practice',
};

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array(total).fill(null).map((_, i) => (
        <View
          key={i}
          style={{
            height: 5,
            width: i < current ? 20 : 5,
            borderRadius: 3,
            backgroundColor: i < current ? Colors.accent : Colors.cardElevated,
          }}
        />
      ))}
    </View>
  );
}

const SET_BURST_N = 22;

function SetBurst({ color }: { color: string }) {
  const config = useRef(
    Array.from({ length: SET_BURST_N }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 90;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        size: 4 + Math.random() * 6,
        white: Math.random() > 0.5,
      };
    })
  ).current;

  const anims = useRef(Array.from({ length: SET_BURST_N }, () => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      11,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 680, useNativeDriver: true }))
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const { tx, ty, size, white } = config[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size,
              height: size,
              marginTop: -(size / 2),
              marginLeft: -(size / 2),
              borderRadius: size / 2,
              backgroundColor: white ? Colors.white : color,
              transform: [
                { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
                { scale: anim.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1.5, 0.15] }) },
              ],
              opacity: anim.interpolate({ inputRange: [0, 0.08, 0.55, 1], outputRange: [0, 1, 0.9, 0] }),
            }}
          />
        );
      })}
    </View>
  );
}

export default function SessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source: string; moduleId?: string; customProgramId?: string }>();
  const { profile, devFastMode } = useUserStore();
  const { progress } = useProgressStore();
  const { plan, markCompleted } = usePlanStore();
  const { loadProgress } = useProgressStore();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<SessionState>('preview');
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [completedProgress, setCompletedProgress] = useState<UserProgress | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [showBadgeReveal, setShowBadgeReveal] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [burstCount, setBurstCount] = useState(0);
  const [customProgramName, setCustomProgramName] = useState<string | undefined>();
  const [completeTitleFn] = useState(() => COMPLETE_TITLES[Math.floor(Math.random() * COMPLETE_TITLES.length)]);

  const hasAdvancedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseWallStartRef = useRef<number>(0);
  const exerciseWallTimeLeftRef = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const levelPopAnim = useRef(new Animated.Value(1)).current;
  const preSessionProgressRef = useRef<UserProgress | null>(null);

  useEffect(() => {
    preSessionProgressRef.current = progress;
    let exs: Exercise[] = [];
    if (params.source === 'module' && params.moduleId) {
      const module = moduleRepository.module(params.moduleId);
      if (module) exs = exerciseRepository.exercises(module.exercise_ids);
      setExercises(exs);
      if (exs.length > 0) setTimeLeft(exs[0].duration_seconds);
    } else if (params.source === 'customProgram' && params.customProgramId) {
      (async () => {
        const prog = await getCustomProgram(params.customProgramId!);
        if (prog) {
          setCustomProgramName(prog.name);
          const resolved = await resolveExerciseIds(prog.exerciseIds);
          setExercises(resolved);
          if (resolved.length > 0) setTimeLeft(resolved[0].duration_seconds);
        }
      })();
    } else if (plan) {
      exs = exerciseRepository.exercises(plan.exerciseIds);
      setExercises(exs);
      if (exs.length > 0) setTimeLeft(exs[0].duration_seconds);
    }
  }, []);

  useEffect(() => {
    if (!completedProgress) return;
    const old = preSessionProgressRef.current;
    if (!old) return;
    const oldProg = xpProgress(old);
    const newProg = xpProgress(completedProgress);
    const didLevelUp = completedProgress.level > old.level;
    if (didLevelUp) setLeveledUp(true);
    xpBarAnim.setValue(oldProg);
    if (didLevelUp) {
      Animated.sequence([
        Animated.timing(xpBarAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.delay(350),
        Animated.timing(xpBarAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.timing(xpBarAnim, { toValue: newProg, duration: 700, useNativeDriver: false }),
      ]).start();
      setTimeout(() => {
        Animated.spring(levelPopAnim, {
          toValue: 1.6,
          useNativeDriver: true,
          speed: 20,
          bounciness: 18,
        }).start(() => {
          Animated.spring(levelPopAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 14,
            bounciness: 6,
          }).start();
        });
      }, 1050);
    } else {
      Animated.timing(xpBarAnim, { toValue: newProg, duration: 1200, useNativeDriver: false }).start();
    }
  }, [completedProgress]);

  // Show badge reveal overlay 1.8s after session ends (lets XP bar animate first)
  useEffect(() => {
    if (newBadges.length === 0) return;
    const t = setTimeout(() => setShowBadgeReveal(true), 1800);
    return () => clearTimeout(t);
  }, [newBadges.length]);

  const currentExercise = exercises[currentIndex];
  const catColor = currentExercise ? CATEGORY_COLOR[currentExercise.category] : Colors.accent;
  const totalSets = currentExercise?.sets ?? 1;
  const hasMultipleSets = totalSets > 1;
  const allSetsDone = !hasMultipleSets || currentSet > totalSets;
  const timedSetWaiting = state === 'exercise' && !currentExercise?.reps && timeLeft === 0 && currentSet < totalSets;

  const advanceExercise = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((ci) => ci + 1);
      setState('preview');
    } else {
      finishSession().catch(console.error);
    }
  }, [currentIndex, exercises.length]);

  const finishSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
    setSessionDuration(dur);
    setState('complete');
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();

    if (!progress) return;
    const source: SessionSource | null =
      params.source === 'module' && params.moduleId
        ? { type: 'module', moduleId: params.moduleId }
        : params.source === 'customProgram' && params.customProgramId
          ? { type: 'customProgram', programId: params.customProgramId }
          : plan
            ? { type: 'dailyPlan', plan }
            : null;
    if (!source) return;

    try {
      const { xpEarned: earned, updatedProgress, newBadges: earned_badges } = await persistSessionCompletion(
        source, exercises, dur, progress
      );
      setXpEarned(earned);
      setCompletedProgress(updatedProgress);
      if (earned_badges.length > 0) {
        setNewBadges(earned_badges);
      }
      if (source.type === 'dailyPlan') await markCompleted(earned);
      await loadProgress();
    } catch (e) {
      console.error('Failed to persist session:', e);
    }
  }, [progress, exercises, params, plan, markCompleted]);

  useEffect(() => {
    if (state === 'complete' || state === 'preview' || !currentExercise) return;
    if (currentExercise.reps) return;
    if (isPaused) return;

    if (timerRef.current) clearInterval(timerRef.current);
    hasAdvancedRef.current = false;

    const totalSecs = totalDuration || currentExercise.duration_seconds;
    if (totalSecs === 0) return;
    const startProgress = 1 - timeLeft / totalSecs;
    progressAnim.setValue(startProgress);

    exerciseWallStartRef.current = Date.now();
    exerciseWallTimeLeftRef.current = timeLeft;

    // Drive both the ring and the countdown from the same elapsed value so
    // they are always in sync — no separate Animated.timing clock to drift.
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - exerciseWallStartRef.current) / 1000;
      const duration = exerciseWallTimeLeftRef.current;
      const progress = Math.min(1, startProgress + (1 - startProgress) * (elapsed / duration));
      const remaining = Math.max(0, Math.ceil(duration - elapsed));

      progressAnim.setValue(progress);
      setTimeLeft((prev) => (remaining !== prev ? remaining : prev));

      if (elapsed >= duration) {
        clearInterval(timerRef.current!);
        if (!hasAdvancedRef.current) {
          hasAdvancedRef.current = true;
          if (hasMultipleSets && currentSet < totalSets) {
            setBurstCount((c) => c + 1);
          } else {
            advanceExercise();
          }
        }
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, isPaused, currentIndex, exercises, currentSet]);

  useEffect(() => {
    if (currentExercise) {
      setTimeLeft(currentExercise.duration_seconds);
      setTotalDuration(currentExercise.duration_seconds);
      setCurrentSet(1);
      setBurstCount(0);
    }
  }, [currentIndex]);

  function handleDone() {
    if (!profile?.onboardingCompleted) {
      router.replace('/(onboarding)/paywall');
    } else if (!profile?.reminderSet) {
      router.push('/set-reminder');
    } else if (params.source === 'module') {
      router.replace('/(tabs)/');
    } else {
      router.back();
    }
  }

  function handleClose() {
    Alert.alert('Leave session?', 'Your progress won\'t be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  function handleReady() {
    if (currentIndex === 0) startTimeRef.current = Date.now();
    setState('exercise');
  }

  function handleCompleteSet() {
    setBurstCount((c) => c + 1);
    setCurrentSet((s) => s + 1);
  }

  function handleStartNextSet() {
    const dur = currentExercise!.duration_seconds;
    hasAdvancedRef.current = false;
    setCurrentSet((s) => s + 1);
    setTimeLeft(dur);
    setTotalDuration(dur);
  }

  function handleNext() {
    if (state === 'exercise' && (currentExercise?.reps || devFastMode)) {
      advanceExercise();
    }
  }


  if (state === 'complete') {
    const displayProgress = completedProgress ?? progress;
    const currentLevelXP = xpForLevel(displayProgress?.level ?? 1);
    const nextLevelXP = xpForNextLevel(displayProgress?.level ?? 1);
    const xpIntoLevel = (displayProgress?.totalXP ?? 0) - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const isDailyPlan = params.source !== 'module' && params.source !== 'customProgram';
    const completedModuleId = params.source === 'module' ? params.moduleId : undefined;
    const completeIcon: IoniconsName = isDailyPlan
      ? 'ribbon'
      : params.source === 'customProgram'
        ? 'color-wand'
        : (MODULE_ICON[completedModuleId ?? ''] ?? 'checkmark') as IoniconsName;
    const completeMessage = isDailyPlan
      ? 'Your spine thanks you. Keep the streak alive tomorrow.'
      : params.source === 'customProgram'
        ? 'Great work. Keep the momentum going.'
        : MODULE_COMPLETE_MESSAGE[completedModuleId ?? ''] ?? 'Great work. Keep the momentum going.';

    const handleShare = async () => {
      const streak = displayProgress?.streakDays ?? 0;
      const time = formatTime(sessionDuration);
      let message: string;
      if (isDailyPlan) {
        message = `Just finished my daily posture session on Align.${streak > 0 ? ` ${streak} day streak.` : ''} ${time}.`;
      } else if (params.source === 'customProgram') {
        message = `Just finished a custom program on Align. ${time}.`;
      } else {
        const modName = moduleRepository.module(completedModuleId ?? '')?.name ?? 'a posture program';
        message = `Just finished the ${modName} program on Align. ${time}.`;
      }
      try {
        await Share.share({ message });
      } catch {}
    };

    return (
      <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.completeContainer}>
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name={completeIcon} size={40} color={Colors.white} />
          </Animated.View>
          <Text style={styles.completeLabel}>SESSION COMPLETE</Text>
          <Text style={styles.completeTitle}>{completeTitleFn(profile?.name ?? 'you')}</Text>
          <Text style={[Typography.body, { color: Colors.secondaryText, textAlign: 'center', marginTop: 4 }]}>
            {completeMessage}
          </Text>

          <View style={styles.xpProgressWrap}>
            <View style={styles.xpProgressRow}>
              <Animated.Text style={[
                Typography.label,
                { fontSize: 17, lineHeight: 22 },
                leveledUp && { color: Colors.accent, fontWeight: 'bold' },
                { transform: [{ scale: levelPopAnim }], transformOrigin: 'left center' },
              ]}>
                LEVEL {displayProgress?.level ?? 1}
              </Animated.Text>
              <Text style={[Typography.label, { fontSize: 17, lineHeight: 22, color: Colors.accent }]}>+{xpEarned} XP</Text>
            </View>
            <View style={styles.xpBar}>
              <Animated.View style={[styles.xpFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={[Typography.caption, { fontSize: 14, lineHeight: 18, color: Colors.secondaryText }]}>
              {xpIntoLevel} / {xpNeededForLevel} XP
            </Text>
            {leveledUp && (
              <View style={styles.levelUpBadge}>
                <Ionicons name="trending-up" size={14} color={Colors.white} />
                <Text style={styles.levelUpText}>LEVEL UP!</Text>
              </View>
            )}
          </View>

          <View style={styles.completeStats}>
            <View style={styles.completeStat}>
              <Text style={styles.completeStatValue}>+{xpEarned}</Text>
              <Text style={styles.completeStatLabel}>XP EARNED</Text>
            </View>
            {isDailyPlan && (
              <View style={styles.completeStat}>
                <Text style={styles.completeStatValue}>{displayProgress?.streakDays ?? 0}</Text>
                <Text style={styles.completeStatLabel}>DAY STREAK</Text>
              </View>
            )}
            <View style={styles.completeStat}>
              <Text style={styles.completeStatValue}>{formatTime(sessionDuration)}</Text>
              <Text style={styles.completeStatLabel}>TIME</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.tight, width: '100%' }}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={Colors.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDone}
              style={[styles.doneBtn, styles.doneBtnPrimary, { flex: 1, width: undefined }]}
            >
              <Text style={[styles.doneBtnText, styles.doneBtnTextPrimary]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal visible={showBadgeReveal} transparent animationType="none" statusBarTranslucent>
        <BadgeReveal badges={newBadges} onDismiss={() => setShowBadgeReveal(false)} />
      </Modal>
    </>
  );
  }

  if (!currentExercise) return null;

  const moduleTitle = params.source === 'module' && params.moduleId
    ? moduleRepository.module(params.moduleId)?.name ?? 'Program'
    : params.source === 'customProgram'
      ? customProgramName ?? 'Custom Program'
      : 'Daily Plan';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{moduleTitle}</Text>
          <Text style={styles.headerCounter}>{currentIndex + 1}/{exercises.length}</Text>
        </View>
        <ProgressDots total={exercises.length} current={currentIndex + 1} />
      </View>

      {state === 'preview' ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.previewScroll}
        >
          <ExerciseAnimation
            exerciseId={currentExercise.id}
            catColor={CATEGORY_COLOR[currentExercise.category]}
            slot={currentExercise.slot}
            style={styles.previewVideo}
          />

          <View style={styles.previewContent}>
            {/* Chips */}
            <View style={styles.previewChipsRow}>
              <View style={[styles.previewChip, { backgroundColor: CATEGORY_COLOR[currentExercise.category] + '22', borderColor: CATEGORY_COLOR[currentExercise.category] + '55' }]}>
                <Text style={[styles.previewChipText, { color: CATEGORY_COLOR[currentExercise.category] }]}>
                  {CATEGORY_LABEL[currentExercise.category]}
                </Text>
              </View>
              <View style={styles.previewChip}>
                <Ionicons name="time-outline" size={12} color={Colors.secondaryText} />
                <Text style={styles.previewChipText}>
                  {currentExercise.reps
                    ? `${currentExercise.reps} reps · ${currentExercise.sets ?? 1} sets`
                    : currentExercise.sets
                      ? `${currentExercise.duration_seconds}s × ${currentExercise.sets}`
                      : `${currentExercise.duration_seconds}s`}
                </Text>
              </View>
              <View style={styles.previewChip}>
                <Text style={styles.previewChipText}>{SLOT_NAME[currentExercise.slot]}</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.previewTitle}>{currentExercise.name}</Text>

            {/* About */}
            <View style={styles.previewSection}>
              <Text style={styles.previewSectionLabel}>ABOUT</Text>
              <Text style={styles.previewSectionBody}>{currentExercise.description}</Text>
            </View>

            {/* Instructions */}
            {currentExercise.instructions.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionLabel}>HOW TO DO IT</Text>
                {currentExercise.instructions.map((step, i) => (
                  <View key={i} style={styles.previewStep}>
                    <View style={[styles.previewStepNum, {
                      backgroundColor: CATEGORY_COLOR[currentExercise.category] + '1A',
                      borderColor: CATEGORY_COLOR[currentExercise.category] + '55',
                    }]}>
                      <Text style={[styles.previewStepNumText, { color: CATEGORY_COLOR[currentExercise.category] }]}>{i + 1}</Text>
                    </View>
                    <Text style={styles.previewStepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Setup */}
            {(currentExercise.position || (currentExercise.equipment && currentExercise.equipment !== 'none')) && (
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionLabel}>SETUP</Text>
                {currentExercise.position && (
                  <View style={styles.previewSetupItem}>
                    <Ionicons name="body-outline" size={16} color={Colors.secondaryText} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewSetupLabel}>Starting position</Text>
                      <Text style={styles.previewSetupValue}>{formatLabel(currentExercise.position)}</Text>
                    </View>
                  </View>
                )}
                {currentExercise.equipment && currentExercise.equipment !== 'none' && (
                  <View style={styles.previewSetupItem}>
                    <Ionicons name="cube-outline" size={16} color={Colors.secondaryText} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewSetupLabel}>Equipment</Text>
                      <Text style={styles.previewSetupValue}>{formatLabel(currentExercise.equipment)}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.body}>
          <View style={styles.videoCard}>
            <ExerciseAnimation
              exerciseId={currentExercise.id}
              catColor={CATEGORY_COLOR[currentExercise.category]}
              slot={currentExercise.slot}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{SLOT_NAME[currentExercise.slot]}</Text>
            </View>
          </View>

          <Text style={styles.exerciseName}>{currentExercise.name}</Text>
          <Text style={styles.exerciseSub}>
            {currentExercise.reps
              ? hasMultipleSets ? `${currentExercise.reps} reps per set` : `${currentExercise.reps} reps`
              : hasMultipleSets ? `${currentExercise.duration_seconds}s · ${totalSets} sets` : `${currentExercise.duration_seconds}s hold`}
          </Text>

          {currentExercise.reps ? (
            <View style={styles.repDisplay}>
              {hasMultipleSets && (
                <View style={styles.setDots}>
                  {Array.from({ length: totalSets }, (_, i) => {
                    const done = i < currentSet - 1;
                    const active = i === currentSet - 1 && !allSetsDone;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.setDot,
                          done ? styles.setDotDone : active ? styles.setDotActive : styles.setDotPending,
                        ]}
                      >
                        {done && <Ionicons name="checkmark" size={11} color={Colors.white} />}
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={styles.repBurstWrap}>
                {burstCount > 0 && <SetBurst key={burstCount} color={catColor} />}
                <Text style={styles.repNumber}>{currentExercise.reps}</Text>
              </View>
              <Text style={styles.repUnit}>REPS</Text>
              {hasMultipleSets && (
                <Text style={styles.repSets}>
                  {allSetsDone ? 'All sets complete' : `Set ${currentSet} of ${totalSets}`}
                </Text>
              )}
            </View>
          ) : (
            <>
              {hasMultipleSets && (
                <View style={styles.setDots}>
                  {Array.from({ length: totalSets }, (_, i) => {
                    const done = i < currentSet - 1;
                    const active = i === currentSet - 1 && !timedSetWaiting;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.setDot,
                          done ? styles.setDotDone : active ? styles.setDotActive : styles.setDotPending,
                        ]}
                      >
                        {done && <Ionicons name="checkmark" size={11} color={Colors.white} />}
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={styles.timedBurstWrap}>
                {burstCount > 0 && <SetBurst key={burstCount} color={catColor} />}
                <ProgressRing
                  animatedProgress={progressAnim}
                  size={160}
                  strokeWidth={8}
                  timeLabel={timedSetWaiting ? 'Done!' : formatTime(timeLeft)}
                  subLabel={timedSetWaiting ? 'SET COMPLETE' : 'REMAINING'}
                />
              </View>
              {hasMultipleSets && (
                <Text style={styles.repSets}>
                  {timedSetWaiting ? `Set ${currentSet} complete` : `Set ${currentSet} of ${totalSets}`}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {state === 'preview' ? (
          <Button label="Ready" onPress={handleReady} style={{ flex: 1 }} />
        ) : currentExercise.reps ? (
          !allSetsDone ? (
            <Button
              label={`Complete Set ${currentSet}`}
              onPress={handleCompleteSet}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              label={currentIndex === exercises.length - 1 ? 'Finish' : 'Next →'}
              onPress={handleNext}
              style={{ flex: 1 }}
            />
          )
        ) : timedSetWaiting ? (
          <Button
            label={`Start Set ${currentSet + 1}`}
            onPress={handleStartNextSet}
            style={{ flex: 1 }}
          />
        ) : (
          <>
            <Button
              label={currentIndex === exercises.length - 1 ? 'Finish' : 'Next →'}
              onPress={handleNext}
              disabled={!devFastMode}
              style={{ flex: 1 }}
            />
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => setIsPaused((p) => !p)}>
              <Ionicons name={isPaused ? 'play' : 'pause'} size={22} color={Colors.primaryText} />
            </TouchableOpacity>
          </>
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
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.tight,
    paddingBottom: Spacing.inner,
    gap: Spacing.inner,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...Typography.subheadline, textAlign: 'center' },
  headerCounter: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, textAlign: 'center', marginTop: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.card, gap: Spacing.inner },
  restLabel: { ...Typography.title, color: Colors.secondaryText, letterSpacing: 2 },
  videoCard: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryChip: {
    position: 'absolute',
    top: Spacing.inner,
    left: Spacing.inner,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 4,
  },
  categoryChipText: { ...Typography.label, fontSize: 14, lineHeight: 18, color: Colors.primaryText },
  exerciseName: { ...Typography.title, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  exerciseSub: { ...Typography.body, fontSize: 17, lineHeight: 24, color: Colors.secondaryText },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.tight,
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.card,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: Radii.button,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.card,
    gap: Spacing.inner,
  },
  checkWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.micro,
  },
  completeLabel: { ...Typography.label, fontSize: 14, lineHeight: 18, color: Colors.accent, letterSpacing: 2, textTransform: 'uppercase' },
  completeTitle: { ...Typography.display, fontSize: 36, lineHeight: 44, textAlign: 'center' },
  xpProgressWrap: { width: '100%', gap: Spacing.micro },
  xpProgressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpBar: { height: 6, backgroundColor: Colors.cardElevated, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  levelUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 5,
    marginTop: Spacing.micro,
  },
  levelUpText: { ...Typography.label, fontSize: 14, lineHeight: 18, color: Colors.white, letterSpacing: 1 },
  completeStats: { flexDirection: 'row', gap: Spacing.tight, width: '100%' },
  completeStat: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    alignItems: 'center',
    gap: 4,
  },
  completeStatValue: { ...Typography.title },
  completeStatLabel: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  shareBtn: {
    width: 52,
    height: 52,
    borderRadius: Radii.button,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radii.button,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnPrimary: { backgroundColor: Colors.accent },
  doneBtnText: { fontFamily: FontFamily.poppinsExtraBold, fontSize: 22, lineHeight: 28, letterSpacing: 0.3 },
  doneBtnTextPrimary: { color: Colors.white },
  previewScroll: { paddingBottom: Spacing.card },
  previewVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, gap: Spacing.section },
  previewChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.tight },
  previewChip: {
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
  previewChipText: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.secondaryText },
  previewTitle: { ...Typography.title, marginTop: -Spacing.tight },
  previewSection: { gap: Spacing.tight },
  previewSectionLabel: { ...Typography.label, fontSize: 14, lineHeight: 18, color: Colors.accent, letterSpacing: 1.5, marginBottom: 2 },
  previewSectionBody: { ...Typography.body, fontSize: 17, lineHeight: 26, color: Colors.secondaryText },
  previewStep: { flexDirection: 'row', gap: Spacing.inner, alignItems: 'flex-start' },
  previewStepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  previewStepNumText: { ...Typography.label, fontSize: 14, lineHeight: 18 },
  previewStepText: { ...Typography.body, fontSize: 17, lineHeight: 26, color: Colors.secondaryText, flex: 1 },
  previewSetupItem: {
    flexDirection: 'row',
    gap: Spacing.inner,
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
  },
  previewSetupLabel: { ...Typography.caption, fontSize: 13, lineHeight: 18, color: Colors.tertiaryText },
  previewSetupValue: { ...Typography.bodyMedium, fontSize: 17, lineHeight: 24, marginTop: 2 },
  repDisplay: { alignItems: 'center', gap: Spacing.tight },
  repBurstWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 100,
  },
  repNumber: { ...Typography.display, fontSize: 72, lineHeight: 80, color: Colors.primaryText },
  repUnit: { ...Typography.label, fontSize: 16, lineHeight: 20, color: Colors.secondaryText, marginTop: -16 },
  repSets: { ...Typography.body, fontSize: 17, lineHeight: 24, color: Colors.tertiaryText },
  setDots: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  setDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setDotDone: { backgroundColor: Colors.accent },
  setDotActive: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.accent },
  setDotPending: { backgroundColor: Colors.cardElevated },
  timedBurstWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
  },
});
