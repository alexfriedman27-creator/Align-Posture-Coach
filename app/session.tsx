import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Animated, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';
import { ProgressRing } from '../components/session/ProgressRing';
import { BadgeReveal } from '../components/session/BadgeReveal';
import { Button } from '../components/shared/Button';
import { exerciseRepository } from '../lib/data/ExerciseRepository';
import { moduleRepository } from '../lib/data/ModuleRepository';
import { useUserStore } from '../lib/store/useUserStore';
import { useProgressStore } from '../lib/store/useProgressStore';
import { usePlanStore } from '../lib/store/usePlanStore';
import { persistSessionCompletion, SessionSource } from '../lib/services/SessionManager';
import { Exercise, SLOT_NAME } from '../types/Exercise';
import { xpProgress, xpForLevel, xpForNextLevel, UserProgress } from '../types/UserProgress';
import { Badge } from '../types/Badge';

type SessionState = 'preview' | 'exercise' | 'complete';

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
  const params = useLocalSearchParams<{ source: string; moduleId?: string }>();
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

  const hasAdvancedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const levelPopAnim = useRef(new Animated.Value(1)).current;
  const preSessionProgressRef = useRef<UserProgress | null>(null);

  useEffect(() => {
    preSessionProgressRef.current = progress;
    let exs: Exercise[] = [];
    if (params.source === 'module' && params.moduleId) {
      const module = moduleRepository.module(params.moduleId);
      if (module) exs = exerciseRepository.exercises(module.exercise_ids);
    } else if (plan) {
      exs = exerciseRepository.exercises(plan.exerciseIds);
    }
    setExercises(exs);
    if (exs.length > 0) setTimeLeft(exs[0].duration_seconds);
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
    const source: SessionSource | null = params.source === 'module' && params.moduleId
      ? { type: 'module', moduleId: params.moduleId }
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
    if (animRef.current) animRef.current.stop();
    if (isPaused) return;

    if (timerRef.current) clearInterval(timerRef.current);
    hasAdvancedRef.current = false;

    const totalSecs = totalDuration || currentExercise.duration_seconds;
    progressAnim.setValue(1 - timeLeft / totalSecs);
    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: timeLeft * 1000,
      useNativeDriver: false,
    });
    animRef.current.start();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!hasAdvancedRef.current) {
            hasAdvancedRef.current = true;
            if (hasMultipleSets && currentSet < totalSets) {
              setBurstCount((c) => c + 1);
            } else {
              advanceExercise();
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) animRef.current.stop();
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

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((ci) => ci - 1);
      setState('preview');
    }
  }

  if (state === 'complete') {
    const displayProgress = completedProgress ?? progress;
    const currentLevelXP = xpForLevel(displayProgress?.level ?? 1);
    const nextLevelXP = xpForNextLevel(displayProgress?.level ?? 1);
    const xpIntoLevel = (displayProgress?.totalXP ?? 0) - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    return (
      <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.completeContainer}>
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </Animated.View>
          <Text style={styles.completeLabel}>SESSION COMPLETE</Text>
          <Text style={styles.completeTitle}>Nicely done, {profile?.name ?? 'you'}</Text>
          <Text style={[Typography.body, { color: Colors.secondaryText, textAlign: 'center', marginTop: 4 }]}>
            Your spine thanks you. Keep the streak alive tomorrow.
          </Text>

          <View style={styles.xpProgressWrap}>
            <View style={styles.xpProgressRow}>
              <Animated.Text style={[
                Typography.label,
                leveledUp && { color: Colors.accent, fontWeight: 'bold' },
                { transform: [{ scale: levelPopAnim }], transformOrigin: 'left center' },
              ]}>
                LEVEL {displayProgress?.level ?? 1}
              </Animated.Text>
              <Text style={[Typography.label, { color: Colors.accent }]}>+{xpEarned} XP</Text>
            </View>
            <View style={styles.xpBar}>
              <Animated.View style={[styles.xpFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={[Typography.caption, { color: Colors.secondaryText }]}>
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
            <View style={styles.completeStat}>
              <Text style={styles.completeStatValue}>{displayProgress?.streakDays ?? 0}</Text>
              <Text style={styles.completeStatLabel}>DAY STREAK</Text>
            </View>
            <View style={styles.completeStat}>
              <Text style={styles.completeStatValue}>{Math.round(sessionDuration / 60)}</Text>
              <Text style={styles.completeStatLabel}>MINUTES</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleDone}
            style={[styles.doneBtn, styles.doneBtnPrimary]}
          >
            <Text style={[styles.doneBtnText, styles.doneBtnTextPrimary]}>Done</Text>
          </TouchableOpacity>
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
          {/* 16:9 video placeholder */}
          <View style={styles.previewVideo}>
            <View style={[styles.previewVideoBar, { backgroundColor: CATEGORY_COLOR[currentExercise.category] }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: CATEGORY_COLOR[currentExercise.category], opacity: 0.06 }]} />
            <View style={styles.previewVideoCenter}>
              <View style={styles.previewSlotCircle}>
                <Text style={styles.previewSlotCircleText}>{currentExercise.slot.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.previewVideoHint}>Animation coming soon</Text>
            </View>
          </View>

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
            <View style={styles.videoStripe} />
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{SLOT_NAME[currentExercise.slot]}</Text>
            </View>
            <Ionicons name="body" size={40} color={Colors.tertiaryText} style={styles.videoIcon} />
            <Text style={styles.videoLabel}>EXERCISE VIDEO</Text>
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
        <TouchableOpacity style={styles.ctrlBtn} onPress={handlePrev} disabled={currentIndex === 0}>
          <Ionicons name="chevron-back" size={22} color={currentIndex === 0 ? Colors.tertiaryText : Colors.primaryText} />
        </TouchableOpacity>
        {state === 'preview' ? (
          <>
            <Button label="Ready" onPress={handleReady} style={{ flex: 1 }} />
            <View style={[styles.ctrlBtn, { backgroundColor: 'transparent' }]} />
          </>
        ) : currentExercise.reps ? (
          <>
            {!allSetsDone ? (
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
            )}
            <View style={[styles.ctrlBtn, { backgroundColor: 'transparent' }]} />
          </>
        ) : timedSetWaiting ? (
          <>
            <Button
              label={`Start Set ${currentSet + 1}`}
              onPress={handleStartNextSet}
              style={{ flex: 1 }}
            />
            <View style={[styles.ctrlBtn, { backgroundColor: 'transparent' }]} />
          </>
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
  headerTitle: { ...Typography.bodyMedium, textAlign: 'center' },
  headerCounter: { ...Typography.caption, color: Colors.secondaryText, textAlign: 'center', marginTop: 1 },
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
  videoStripe: { ...StyleSheet.absoluteFill, opacity: 0.08, backgroundColor: Colors.cardElevated },
  categoryChip: {
    position: 'absolute',
    top: Spacing.inner,
    left: Spacing.inner,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.tight,
    paddingVertical: 4,
  },
  categoryChipText: { ...Typography.label, color: Colors.primaryText },
  videoIcon: { opacity: 0.4 },
  videoLabel: { ...Typography.caption, color: Colors.tertiaryText, letterSpacing: 2, marginTop: Spacing.tight },
  exerciseName: { ...Typography.title, textAlign: 'center' },
  exerciseSub: { ...Typography.body, color: Colors.secondaryText },
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
  completeLabel: { ...Typography.label, color: Colors.accent, letterSpacing: 2, textTransform: 'uppercase' },
  completeTitle: { ...Typography.display, textAlign: 'center' },
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
  levelUpText: { ...Typography.label, color: Colors.white, letterSpacing: 1 },
  completeStats: { flexDirection: 'row', gap: Spacing.tight, width: '100%' },
  completeStat: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    alignItems: 'center',
    gap: 4,
  },
  completeStatValue: { ...Typography.headline },
  completeStatLabel: { ...Typography.caption, color: Colors.secondaryText, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radii.button,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnPrimary: { backgroundColor: Colors.accent },
  doneBtnText: { ...Typography.subheadline },
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
  previewVideoBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  previewVideoCenter: { alignItems: 'center', gap: Spacing.tight },
  previewSlotCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSlotCircleText: { ...Typography.subheadline, color: Colors.secondaryText, letterSpacing: 1 },
  previewVideoHint: { ...Typography.caption, color: Colors.tertiaryText, letterSpacing: 0.5 },
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
  previewChipText: { ...Typography.caption, color: Colors.secondaryText },
  previewTitle: { ...Typography.headline, marginTop: -Spacing.tight },
  previewSection: { gap: Spacing.tight },
  previewSectionLabel: { ...Typography.label, color: Colors.accent, letterSpacing: 1.5, marginBottom: 2 },
  previewSectionBody: { ...Typography.body, color: Colors.secondaryText, lineHeight: 24 },
  previewStep: { flexDirection: 'row', gap: Spacing.inner, alignItems: 'flex-start' },
  previewStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  previewStepNumText: { ...Typography.label },
  previewStepText: { ...Typography.body, color: Colors.secondaryText, flex: 1, lineHeight: 22 },
  previewSetupItem: {
    flexDirection: 'row',
    gap: Spacing.inner,
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
  },
  previewSetupLabel: { ...Typography.caption, color: Colors.tertiaryText },
  previewSetupValue: { ...Typography.bodyMedium, marginTop: 2 },
  repDisplay: { alignItems: 'center', gap: Spacing.tight },
  repBurstWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 100,
  },
  repNumber: { ...Typography.display, fontSize: 72, lineHeight: 80, color: Colors.primaryText },
  repUnit: { ...Typography.label, color: Colors.secondaryText, letterSpacing: 2 },
  repSets: { ...Typography.body, color: Colors.tertiaryText },
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
