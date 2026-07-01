import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Modal, TextInput, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../../lib/design/colors';
import { Typography, FontFamily } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { Card } from '../../components/shared/Card';
import { StatBlock } from '../../components/shared/StatBlock';
import { useProgressStore } from '../../lib/store/useProgressStore';
import { useUserStore } from '../../lib/store/useUserStore';
import { xpProgress, xpForLevel, xpForNextLevel } from '../../types/UserProgress';
import {
  getPhotos, upsertPhoto, deletePhoto,
  getAllModuleSessions, getAllDailyPlans, getCustomPrograms,
} from '../../lib/db/queries';
import { ProgressPhoto } from '../../types/ProgressPhoto';
import { Badge } from '../../types/Badge';
import { BadgeReveal } from '../../components/session/BadgeReveal';
import { checkAndAwardPhotoBadges } from '../../lib/services/SessionManager';
import { ModuleSession } from '../../types/ModuleSession';
import { DailyPlan } from '../../types/DailyPlan';
import { CustomProgram } from '../../types/CustomProgram';
import { moduleRepository } from '../../lib/data/ModuleRepository';
import { exerciseRepository } from '../../lib/data/ExerciseRepository';
import { ModuleIntensity, INTENSITY_LABEL } from '../../types/Module';

const CAPTION_LIMIT = 100;

const CUSTOM_PURPLE = Colors.custom;

const INTENSITY_COLOR: Record<ModuleIntensity, string> = {
  easy: Colors.success,
  moderate: Colors.info,
  hard: Colors.streak,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStr() {
  return new Date().toISOString().slice(0, 7);
}

function formatDisplayDate(dateStr: string): string {
  const today = todayStr();
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [, m, day] = dateStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.abs(Math.round((db - da) / 86400000));
}

function pastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Pro gate ─────────────────────────────────────────────────────────────────

function ProGate() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.gateContainer}>
        <View style={styles.gateLockCircle}>
          <Ionicons name="bar-chart-outline" size={32} color={Colors.accent} />
        </View>
        <Text style={styles.gateChip}>PRO FEATURE</Text>
        <Text style={styles.gateTitle}>Track Your Progress</Text>
        <Text style={styles.gateSub}>
          See your streaks, XP level, session history, and before/after progress photos, all in one place.
        </Text>
        <TouchableOpacity
          style={styles.gateBtn}
          onPress={() => router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } })}
          activeOpacity={0.85}
        >
          <Text style={styles.gateBtnText}>Unlock Align Pro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Add Photo Modal ──────────────────────────────────────────────────────────

interface AddPhotoSheetProps {
  imageUri: string;
  onSave: (caption: string) => void;
  onCancel: () => void;
}

function AddPhotoSheet({ imageUri, onSave, onCancel }: AddPhotoSheetProps) {
  const [caption, setCaption] = useState('');

  return (
    <View style={styles.sheetOverlay}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetCard}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.sheetCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Add Photo</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Image source={{ uri: imageUri }} style={styles.sheetPreview} resizeMode="cover" />

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Caption</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Add a caption…"
              placeholderTextColor={Colors.tertiaryText}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={styles.sheetSaveBtn}
            onPress={() => onSave(caption.trim())}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetSaveBtnText}>Save Photo</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Photo Detail Modal ───────────────────────────────────────────────────────

function PhotoDetailModal({ photo, onClose, onDelete }: { photo: ProgressPhoto; onClose: () => void; onDelete: () => void }) {
  function confirmDelete() {
    Alert.alert('Delete Photo', 'Remove this progress photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  }

  return (
    <Modal visible transparent animationType="fade">
      <SafeAreaView style={styles.detailSafe}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{formatDisplayDate(photo.date)}</Text>
          <View style={styles.detailHeaderRight}>
            <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 16 }}>
              <Ionicons name="trash-outline" size={20} color={Colors.secondaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Image source={{ uri: photo.imageUri }} style={styles.detailImage} resizeMode="cover" />

          {(photo.streakDays !== undefined || photo.level !== undefined) && (
            <View style={styles.detailStats}>
              {photo.streakDays !== undefined && (
                <View style={styles.detailStatPill}>
                  <Ionicons name="flame" size={15} color={Colors.streak} />
                  <Text style={styles.detailStatText}>{photo.streakDays} day streak</Text>
                </View>
              )}
              {photo.level !== undefined && (
                <View style={styles.detailStatPill}>
                  <Ionicons name="star" size={15} color={Colors.accent} />
                  <Text style={styles.detailStatText}>
                    Level {photo.level}{photo.totalXP !== undefined ? ` · ${photo.totalXP} XP` : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {photo.caption ? (
            <Text style={styles.detailCaption}>{photo.caption}</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Photo Card ───────────────────────────────────────────────────────────────

function PhotoCard({ photo, onDelete }: { photo: ProgressPhoto; onDelete: () => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const hasStats = photo.streakDays !== undefined || photo.level !== undefined;
  const isCaptionLong = (photo.caption?.length ?? 0) > CAPTION_LIMIT;

  return (
    <>
      <View style={styles.photoCard}>
        <TouchableOpacity onPress={() => setShowDetail(true)} activeOpacity={0.92}>
          <View style={styles.photoCardImageWrap}>
            <Image source={{ uri: photo.imageUri }} style={styles.photoCardImage} resizeMode="cover" />

            {hasStats && (
              <View style={styles.imageStatsRow}>
                {photo.streakDays !== undefined && (
                  <View style={styles.imageStat}>
                    <Ionicons name="flame" size={11} color={Colors.streak} />
                    <Text style={styles.imageStatText} allowFontScaling={false}>
                      {photo.streakDays} streak
                    </Text>
                  </View>
                )}
                {photo.level !== undefined && (
                  <View style={styles.imageStat}>
                    <Ionicons name="star" size={11} color={Colors.accent} />
                    <Text style={styles.imageStatText} allowFontScaling={false}>
                      Lvl {photo.level}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {photo.caption ? (
          <View style={styles.captionWrap}>
            {isCaptionLong ? (
              <Text style={styles.captionText}>
                {photo.caption.slice(0, CAPTION_LIMIT)}
                <Text style={styles.captionEllipsis}>{'... '}</Text>
                <Text style={styles.captionMore} onPress={() => setShowDetail(true)}>more</Text>
              </Text>
            ) : (
              <Text style={styles.captionText}>{photo.caption}</Text>
            )}
          </View>
        ) : null}

        <View style={styles.photoCardFooter}>
          <Text style={styles.photoCardDate}>{formatDisplayDate(photo.date)}</Text>
          <TouchableOpacity onPress={() => {
            Alert.alert('Delete Photo', 'Remove this progress photo?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]);
          }} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Ionicons name="trash-outline" size={15} color={Colors.tertiaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {showDetail && (
        <PhotoDetailModal
          photo={photo}
          onClose={() => setShowDetail(false)}
          onDelete={onDelete}
        />
      )}
    </>
  );
}

// ─── Reports: Program Leaderboard ─────────────────────────────────────────────

interface ProgramEntry {
  id: string;
  name: string;
  kind: 'daily' | 'builtin' | 'custom';
  intensity?: ModuleIntensity;
  count: number;
}

function buildProgramEntries(
  sessions: ModuleSession[],
  completedPlans: DailyPlan[],
  customPrograms: CustomProgram[],
  period: 'alltime' | 'month',
): ProgramEntry[] {
  const month = monthStr();
  const filteredSessions = period === 'month' ? sessions.filter((s) => s.date.startsWith(month)) : sessions;
  const filteredPlans = period === 'month' ? completedPlans.filter((p) => p.date.startsWith(month)) : completedPlans;

  const counts = new Map<string, number>();
  for (const s of filteredSessions) {
    counts.set(s.moduleId, (counts.get(s.moduleId) ?? 0) + 1);
  }

  const customById = new Map(customPrograms.map((p) => [p.id, p]));
  const entries: ProgramEntry[] = [];

  for (const [id, count] of counts.entries()) {
    const isCustom = id.startsWith('custprog_');
    if (isCustom) {
      const prog = customById.get(id);
      entries.push({ id, name: prog?.name ?? 'Custom Program', kind: 'custom', count });
    } else {
      const mod = moduleRepository.module(id);
      if (mod) {
        entries.push({ id, name: mod.name, kind: 'builtin', intensity: mod.intensity, count });
      }
    }
  }

  entries.sort((a, b) => b.count - a.count);

  return entries.slice(0, 6);
}

function ProgramLeaderboard({
  sessions, completedPlans, customPrograms,
}: {
  sessions: ModuleSession[];
  completedPlans: DailyPlan[];
  customPrograms: CustomProgram[];
}) {
  const [period, setPeriod] = useState<'alltime' | 'month'>('alltime');
  const entries = buildProgramEntries(sessions, completedPlans, customPrograms, period);
  const maxCount = entries.length > 0 ? Math.max(...entries.map((e) => e.count)) : 1;

  return (
    <Card style={styles.reportCard}>
      <View style={styles.reportCardHeader}>
        <Text style={styles.reportCardTitle}>Top Programs</Text>
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'alltime' && styles.periodBtnActive]}
            onPress={() => setPeriod('alltime')}
          >
            <Text style={[styles.periodBtnText, period === 'alltime' && styles.periodBtnTextActive]}>All Time</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'month' && styles.periodBtnActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodBtnText, period === 'month' && styles.periodBtnTextActive]}>This Month</Text>
          </TouchableOpacity>
        </View>
      </View>

      {entries.length === 0 ? (
        <View style={styles.reportEmpty}>
          <Text style={styles.reportEmptyText}>
            {period === 'month' ? 'No sessions this month yet.' : 'Complete a session to see your top programs.'}
          </Text>
        </View>
      ) : (
        <View style={styles.leaderList}>
          {entries.map((entry, i) => {
            const barFill = maxCount > 0 ? entry.count / maxCount : 0;
            const isDaily = entry.kind === 'daily';
            const isCustom = entry.kind === 'custom';
            const chipColor = isDaily
              ? Colors.accent
              : isCustom
              ? CUSTOM_PURPLE
              : INTENSITY_COLOR[entry.intensity!];

            return (
              <View key={entry.id} style={[styles.leaderRow, i < entries.length - 1 && styles.leaderRowBorder]}>
                <Text style={styles.leaderRank}>#{i + 1}</Text>
                <View style={styles.leaderInfo}>
                  <View style={styles.leaderNameRow}>
                    <Text style={styles.leaderName} numberOfLines={1}>{entry.name}</Text>
                    <View style={[styles.leaderChip, { backgroundColor: chipColor + '22', borderColor: chipColor + '55' }]}>
                      <Text style={[styles.leaderChipText, { color: chipColor }]} allowFontScaling={false}>
                        {isDaily ? 'DAILY' : isCustom ? 'CUSTOM' : INTENSITY_LABEL[entry.intensity!].toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.leaderBarRow}>
                    <View style={styles.leaderBarBg}>
                      <View style={[styles.leaderBarFill, { width: `${Math.round(barFill * 100)}%`, backgroundColor: chipColor }]} />
                    </View>
                    <Text style={styles.leaderCount}>{entry.count}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

// ─── Reports: Activity Insights ───────────────────────────────────────────────

function ActivityInsights({
  sessions, completedPlans, thirtyDayDates, totalSessions, totalMinutes,
}: {
  sessions: ModuleSession[];
  completedPlans: DailyPlan[];
  thirtyDayDates: string[];
  totalSessions: number;
  totalMinutes: number;
}) {
  const month = monthStr();
  const filteredSessions = sessions.filter((s) => s.date.startsWith(month));
  const filteredPlans = completedPlans.filter((p) => p.date.startsWith(month));
  const monthSessions = filteredSessions.length + filteredPlans.length;

  const xpThisMonth =
    filteredSessions.reduce((sum, s) => sum + (s.xpEarned ?? 0), 0) +
    filteredPlans.reduce((sum, p) => sum + (p.xpEarned ?? 0), 0);
  const xpLabel = `${xpThisMonth} XP`;

  const avgMins = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  // Most active day of week from last 30 days (all session types)
  const dayCounts = Array(7).fill(0);
  for (const ds of thirtyDayDates) {
    const [y, m, d] = ds.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    dayCounts[dow]++;
  }
  const maxDayCount = Math.max(...dayCounts);
  const topDay = maxDayCount > 0 ? DAY_NAMES[dayCounts.indexOf(maxDayCount)] : null;

  const tiles: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { label: 'Avg Session', value: avgMins > 0 ? `${avgMins} min` : '—', icon: 'time-outline' },
    { label: 'This Month', value: `${monthSessions} sessions`, icon: 'calendar-outline' },
    { label: 'Best Day', value: topDay ?? '—', icon: 'sunny-outline' },
    { label: 'XP This Month', value: xpThisMonth > 0 ? xpLabel : '—', icon: 'flash-outline' },
  ];

  return (
    <Card style={styles.reportCard}>
      <Text style={styles.reportCardTitle}>Activity Insights</Text>
      <View style={styles.insightGrid}>
        {tiles.map((tile, i) => (
          <View key={tile.label} style={[styles.insightTile, i % 2 === 0 && styles.insightTileLeft]}>
            <Ionicons name={tile.icon} size={15} color={Colors.accent} style={{ marginBottom: 8 }} />
            <Text style={styles.insightValue}>{tile.value}</Text>
            <Text style={styles.insightLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}


// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function ProgressTab() {
  const { progress } = useProgressStore();
  const { profile } = useUserStore();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [showBadgeReveal, setShowBadgeReveal] = useState(false);

  // Reports data
  const [moduleSessions, setModuleSessions] = useState<ModuleSession[]>([]);
  const [completedPlans, setCompletedPlans] = useState<DailyPlan[]>([]);
  const [customPrograms, setCustomPrograms] = useState<CustomProgram[]>([]);

  useFocusEffect(useCallback(() => {
    getPhotos().then(setPhotos);
    Promise.all([
      getAllModuleSessions(),
      getAllDailyPlans(),
      getCustomPrograms(),
    ]).then(([sessions, plans, customs]) => {
      setModuleSessions(sessions);
      setCompletedPlans(plans.filter((p) => p.completedAt != null));
      setCustomPrograms(customs);
    });
  }, []));

  const isPro = profile?.isPro ?? false;
  if (!isPro) return <ProGate />;

  const xpProg = progress ? xpProgress(progress) : 0;

  function promptAddPhoto() {
    Alert.alert('Add Progress Photo', undefined, [
      { text: 'Take Photo', onPress: openCamera },
      { text: 'Choose from Library', onPress: openLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function openCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to take a progress photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPendingUri(result.assets[0].uri);
  }

  async function openLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPendingUri(result.assets[0].uri);
  }

  async function handleSave(caption: string) {
    if (!pendingUri) return;
    const photo: ProgressPhoto = {
      id: `photo_${Date.now()}`,
      date: todayStr(),
      imageUri: pendingUri,
      caption: caption || undefined,
      streakDays: progress?.streakDays,
      level: progress?.level,
      totalXP: progress?.totalXP,
    };
    await upsertPhoto(photo);
    const updated = await getPhotos();
    setPhotos(updated);
    setPendingUri(null);

    const badges = await checkAndAwardPhotoBadges();
    if (badges.length > 0) {
      setNewBadges(badges);
      setShowBadgeReveal(true);
    }
  }

  async function handleDelete(id: string) {
    await deletePhoto(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  // Photos are newest-first. Show a few on the main screen; the rest live in "See all".
  const PHOTO_PREVIEW_COUNT = 1;
  const visiblePhotos = photos.slice(0, PHOTO_PREVIEW_COUNT);
  const daysSinceLastPhoto = photos.length > 0 ? daysBetween(photos[0].date, todayStr()) : 0;
  const showPhotoNudge = photos.length > 0 && daysSinceLastPhoto >= 14;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock value={progress?.streakDays ?? 0} label="Day Streak" />
          <StatBlock value={progress?.totalSessions ?? 0} label="Sessions" />
          <StatBlock value={progress?.totalMinutes ?? 0} label="Minutes" />
        </View>

        {/* XP */}
        <Card style={styles.xpCard}>
          <View style={styles.xpRow}>
            <Text style={styles.xpLevel}>LEVEL {progress?.level ?? 1}</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.accent }]}>{Math.round(xpProg * 100)}%</Text>
          </View>
          <Text style={styles.xpValue}>
            {progress ? progress.totalXP - xpForLevel(progress.level) : 0}
            {' / '}
            {progress ? xpForNextLevel(progress.level) - xpForLevel(progress.level) : 0} XP
          </Text>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${Math.round(xpProg * 100)}%` }]} />
          </View>
        </Card>

        {/* Progress Photos */}
        <View>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="camera-outline" size={18} color={Colors.accent} />
              <View>
                <Text style={styles.sectionTitle}>Progress Photos</Text>
                <Text style={styles.sectionSub}>Watch your transformation take shape</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={promptAddPhoto} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={Colors.accent} />
              <Text style={styles.addPhotoBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} onPress={promptAddPhoto} activeOpacity={0.8}>
              <View style={styles.emptyCameraCircle}>
                <Ionicons name="camera-outline" size={28} color={Colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>Document your journey</Text>
              <Text style={styles.emptySub}>Add photos with captions to track how far you've come</Text>
            </TouchableOpacity>
          ) : (
            <>
              {showPhotoNudge && (
                <TouchableOpacity style={styles.nudge} onPress={promptAddPhoto} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={16} color={Colors.accent} />
                  <Text style={styles.nudgeText}>
                    It's been {daysSinceLastPhoto} days since your last photo. Add a fresh one?
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.tertiaryText} />
                </TouchableOpacity>
              )}

              <View style={styles.photoList}>
                {visiblePhotos.map(photo => (
                  <PhotoCard key={photo.id} photo={photo} onDelete={() => handleDelete(photo.id)} />
                ))}
              </View>

              {photos.length > PHOTO_PREVIEW_COUNT && (
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => setShowAllPhotos(true)} activeOpacity={0.8}>
                  <Text style={styles.seeAllBtnText}>See all {photos.length} photos</Text>
                  <Ionicons name="chevron-forward" size={15} color={Colors.accent} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={[styles.sectionHeader, styles.reportsHeader]}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="stats-chart" size={18} color={Colors.accent} />
            <View>
              <Text style={styles.sectionTitle}>Reports</Text>
              <Text style={styles.sectionSub}>Your wins, by the numbers</Text>
            </View>
          </View>
        </View>

        <ProgramLeaderboard
          sessions={moduleSessions}
          completedPlans={completedPlans}
          customPrograms={customPrograms}
        />

        <ActivityInsights
          sessions={moduleSessions}
          completedPlans={completedPlans}
          thirtyDayDates={progress?.thirtyDaySessionDates ?? []}
          totalSessions={progress?.totalSessions ?? 0}
          totalMinutes={progress?.totalMinutes ?? 0}
        />
      </ScrollView>

      {pendingUri && (
        <Modal visible transparent animationType="slide">
          <AddPhotoSheet
            imageUri={pendingUri}
            onSave={handleSave}
            onCancel={() => setPendingUri(null)}
          />
        </Modal>
      )}

      {showAllPhotos && (
        <Modal visible transparent animationType="slide">
          <SafeAreaView style={styles.allSafe}>
            <View style={styles.allHeader}>
              <Text style={styles.allTitle}>Progress Photos</Text>
              <TouchableOpacity onPress={() => setShowAllPhotos(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Colors.primaryText} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.allContent} showsVerticalScrollIndicator={false}>
              {photos.length === 0 ? (
                <Text style={styles.allEmpty}>No photos yet.</Text>
              ) : (
                <View style={styles.photoList}>
                  {photos.map(photo => (
                    <PhotoCard key={photo.id} photo={photo} onDelete={() => handleDelete(photo.id)} />
                  ))}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {showBadgeReveal && newBadges.length > 0 && (
        <Modal visible transparent animationType="none">
          <BadgeReveal badges={newBadges} onDismiss={() => setShowBadgeReveal(false)} />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, paddingBottom: Spacing.card, gap: Spacing.gap },
  heading: { ...Typography.title },

  // Pro gate
  gateContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.card * 1.5, gap: Spacing.tight,
  },
  gateLockCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.tight,
  },
  gateChip: { ...Typography.label, color: Colors.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  gateTitle: { ...Typography.headline, textAlign: 'center', marginTop: 2 },
  gateSub: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center', marginBottom: Spacing.inner },
  gateBtn: {
    backgroundColor: Colors.accent, borderRadius: Radii.button,
    paddingHorizontal: Spacing.card, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  gateBtnText: { ...Typography.bodyMedium, color: Colors.white },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.tight },

  // XP
  xpCard: { gap: Spacing.tight },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLevel: { ...Typography.label, color: Colors.secondaryText, textTransform: 'uppercase', letterSpacing: 1 },
  xpValue: { ...Typography.headline },
  xpBar: { height: 6, backgroundColor: Colors.cardElevated, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },


  // Report cards
  reportCard: { gap: Spacing.inner },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportCardTitle: { ...Typography.bodyMedium },

  // Period toggle
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.chip,
    padding: 2,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.chip - 1,
  },
  periodBtnActive: { backgroundColor: Colors.card },
  periodBtnText: { ...Typography.caption, fontSize: 12, lineHeight: 17, color: Colors.tertiaryText },
  periodBtnTextActive: { color: Colors.primaryText, fontFamily: FontFamily.poppinsBold },

  // Leaderboard
  reportEmpty: { paddingVertical: Spacing.inner, alignItems: 'center' },
  reportEmptyText: { ...Typography.body, fontSize: 14, lineHeight: 20, color: Colors.tertiaryText, textAlign: 'center' },
  leaderList: { gap: 0 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.tight,
    paddingVertical: 8,
  },
  leaderRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardElevated,
  },
  leaderRank: { ...Typography.captionLg, color: Colors.tertiaryText, width: 24, textAlign: 'center' },
  leaderInfo: { flex: 1, gap: 5 },
  leaderNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight },
  leaderName: { ...Typography.bodyMedium, flex: 1 },
  leaderChip: {
    borderRadius: Radii.chip,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  leaderChipText: { fontFamily: FontFamily.poppinsBold, fontSize: 10, lineHeight: 14, letterSpacing: 0.5 },
  leaderBarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.tight },
  leaderBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  leaderBarFill: { height: '100%', borderRadius: 3 },
  leaderCount: { ...Typography.caption, fontSize: 12, lineHeight: 17, color: Colors.secondaryText, width: 28, textAlign: 'right' },

  // Activity insights grid
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  insightTile: {
    width: '50%',
    paddingTop: Spacing.gap,
    paddingBottom: Spacing.gap,
    paddingRight: Spacing.inner,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardElevated,
  },
  insightTileLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.cardElevated,
  },
  insightValue: {
    fontFamily: FontFamily.poppinsExtraBold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.primaryText,
    marginBottom: 3,
  },
  insightLabel: { ...Typography.captionLg, color: Colors.secondaryText },


  // Photos
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.tight },
  // Reports header is a standalone child (not wrapped like Photos), so cancel the
  // container's gap below it to match the Photos header's spacing to its card.
  reportsHeader: { marginBottom: -Spacing.micro },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...Typography.subheadline },
  sectionSub: { ...Typography.caption, color: Colors.secondaryText, marginTop: 1 },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accent + '18',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  addPhotoBtnText: { ...Typography.label, color: Colors.accent },

  nudge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.tight,
    backgroundColor: Colors.accent + '14',
    borderRadius: Radii.card,
    paddingVertical: 10, paddingHorizontal: Spacing.inner,
    marginBottom: Spacing.tight,
  },
  nudgeText: { ...Typography.caption, color: Colors.primaryText, flex: 1 },

  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    paddingVertical: 13,
    marginTop: Spacing.tight,
  },
  seeAllBtnText: { ...Typography.bodyMedium, color: Colors.primaryText },

  allSafe: { flex: 1, backgroundColor: Colors.background },
  allHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.card, paddingVertical: Spacing.inner,
  },
  allTitle: { ...Typography.headline },
  allContent: { paddingHorizontal: Spacing.card, paddingBottom: Spacing.section },
  allEmpty: { ...Typography.body, color: Colors.tertiaryText, textAlign: 'center', paddingVertical: Spacing.section },

  emptyState: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    alignItems: 'center',
    paddingVertical: Spacing.card * 1.5, paddingHorizontal: Spacing.card,
    gap: Spacing.tight,
  },
  emptyCameraCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { ...Typography.subheadline, textAlign: 'center' },
  emptySub: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center' },

  photoList: { gap: Spacing.tight },
  photoCard: { backgroundColor: Colors.card, borderRadius: Radii.card, overflow: 'hidden' },
  photoCardImageWrap: {},
  photoCardImage: { width: '100%', aspectRatio: 4 / 3 },

  imageStatsRow: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', gap: 6,
  },
  imageStat: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(4,6,14,0.65)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  imageStatText: { ...Typography.caption, color: Colors.white, fontSize: 11 },

  captionWrap: { paddingHorizontal: Spacing.inner, paddingTop: 10, paddingBottom: 4 },
  captionText: { ...Typography.body, color: Colors.primaryText },
  captionEllipsis: { color: Colors.secondaryText },
  captionMore: { ...Typography.bodyMedium, color: Colors.accent },

  photoCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.inner, paddingBottom: Spacing.inner, paddingTop: 6,
  },
  photoCardDate: { ...Typography.caption, color: Colors.secondaryText },

  detailSafe: { flex: 1, backgroundColor: Colors.background },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.card, paddingVertical: Spacing.inner,
  },
  detailHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  detailDate: { ...Typography.bodyMedium },
  detailImage: { width: '100%', aspectRatio: 4 / 3 },
  detailStats: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: Spacing.card, paddingTop: Spacing.inner,
  },
  detailStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.card,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  detailStatText: { ...Typography.bodyMedium, color: Colors.primaryText },
  detailCaption: {
    ...Typography.body, color: Colors.primaryText,
    paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, paddingBottom: 40,
  },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(4,6,14,0.6)', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.card, paddingVertical: Spacing.inner,
    borderBottomWidth: 1, borderBottomColor: Colors.cardElevated,
  },
  sheetTitle: { ...Typography.bodyMedium },
  sheetCancel: { ...Typography.body, color: Colors.secondaryText },
  sheetPreview: { width: '100%', aspectRatio: 4 / 3 },
  sheetSection: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, gap: 8 },
  sheetLabel: { ...Typography.label, color: Colors.secondaryText, letterSpacing: 0.5 },
  sheetInput: {
    ...Typography.body,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    minHeight: 72,
    color: Colors.primaryText,
    textAlignVertical: 'top',
  },
  dateScrollView: { marginHorizontal: -Spacing.card },
  dateChipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.card },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.cardElevated },
  dateChipSelected: { backgroundColor: Colors.accent },
  dateChipText: { ...Typography.caption, color: Colors.secondaryText },
  dateChipTextSelected: { color: Colors.white, fontFamily: FontFamily.poppinsMedium },
  sheetSaveBtn: {
    backgroundColor: Colors.accent, borderRadius: Radii.button,
    margin: Spacing.card, marginTop: Spacing.inner, paddingVertical: 14, alignItems: 'center',
  },
  sheetSaveBtnText: { ...Typography.bodyMedium, color: Colors.white },
});
