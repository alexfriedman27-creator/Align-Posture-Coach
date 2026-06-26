import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Modal, TextInput, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { Card } from '../../components/shared/Card';
import { StatBlock } from '../../components/shared/StatBlock';
import { useProgressStore } from '../../lib/store/useProgressStore';
import { useUserStore } from '../../lib/store/useUserStore';
import { xpProgress, xpForLevel, xpForNextLevel } from '../../types/UserProgress';
import { getPhotos, upsertPhoto, deletePhoto } from '../../lib/db/queries';
import { ProgressPhoto } from '../../types/ProgressPhoto';
import { Badge } from '../../types/Badge';
import { BadgeReveal } from '../../components/session/BadgeReveal';
import { checkAndAwardPhotoBadges } from '../../lib/services/SessionManager';

const CAPTION_LIMIT = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

function pastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

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

          {/* Stats snapshot */}
          {(photo.streakDays !== undefined || photo.level !== undefined) && (
            <View style={styles.detailStats}>
              {photo.streakDays !== undefined && (
                <View style={styles.detailStatPill}>
                  <Ionicons name="flame" size={15} color="#FF7A33" />
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

          {/* Full caption */}
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

            {/* Stat overlay at bottom of image */}
            {hasStats && (
              <View style={styles.imageStatsRow}>
                {photo.streakDays !== undefined && (
                  <View style={styles.imageStat}>
                    <Ionicons name="flame" size={11} color="#FF7A33" />
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

        {/* Caption with truncation */}
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
          }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

// ─── Calendar ─────────────────────────────────────────────────────────────────

function MonthCalendar({ sessionDates }: { sessionDates: string[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const mondayOffset = (firstDayOfWeek + 6) % 7;

  const dateSet = new Set(sessionDates.map((d) => d.slice(0, 10)));
  const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const cells: (number | null)[] = Array(mondayOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = now.toLocaleString('default', { month: 'long' });
  const completedDays = cells.filter((d) => {
    if (!d) return false;
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return dateSet.has(ds);
  }).length;
  const totalPast = cells.filter((d) => {
    if (!d) return false;
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return ds <= today;
  }).length;
  const activePct = totalPast > 0 ? Math.round((completedDays / totalPast) * 100) : 0;

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Card style={styles.calCard}>
      <View style={styles.calHeader}>
        <Text style={styles.calTitle}>{monthName} {year}</Text>
        <Text style={[Typography.caption, { color: Colors.accent }]}>{activePct}% active</Text>
      </View>
      <View style={styles.calDayHeaders}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={styles.calDayLabel}>{d}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calRow}>
          {Array(7).fill(null).map((_, ci) => {
            const day = row[ci] ?? null;
            if (!day) return <View key={ci} style={styles.calCell} />;
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const done = dateSet.has(ds);
            const isPast = ds <= today;
            const isToday = ds === today;
            return (
              <View
                key={ci}
                style={[
                  styles.calCell,
                  done && styles.calCellDone,
                  !done && isPast && styles.calCellMissed,
                  isToday && !done && styles.calCellToday,
                ]}
              >
                {done
                  ? <Ionicons name="checkmark" size={13} color={Colors.white} />
                  : <Text style={[styles.calDayNum, isToday && styles.calDayNumToday]}>{day}</Text>
                }
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function ProgressTab() {
  const { progress } = useProgressStore();
  const { profile } = useUserStore();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [showBadgeReveal, setShowBadgeReveal] = useState(false);

  useFocusEffect(useCallback(() => {
    getPhotos().then(setPhotos);
  }, []));

  const isPro = profile?.isPro ?? false;
  if (!isPro) return <ProGate />;

  const xpProg = progress ? xpProgress(progress) : 0;

  async function openPicker() {
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Progress</Text>

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

        {/* Calendar */}
        <MonthCalendar sessionDates={progress?.thirtyDaySessionDates ?? []} />

        {/* Progress Photos */}
        <View>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="camera-outline" size={18} color={Colors.accent} />
              <View>
                <Text style={styles.sectionTitle}>Progress Photos</Text>
                <Text style={styles.sectionSub}>Hold yourself accountable</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={openPicker} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={Colors.accent} />
              <Text style={styles.addPhotoBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} onPress={openPicker} activeOpacity={0.8}>
              <View style={styles.emptyCameraCircle}>
                <Ionicons name="camera-outline" size={28} color={Colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>Document your journey</Text>
              <Text style={styles.emptySub}>Add photos with captions to track how far you've come</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoList}>
              {photos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onDelete={() => handleDelete(photo.id)} />
              ))}
            </View>
          )}
        </View>
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

      {showBadgeReveal && newBadges.length > 0 && (
        <Modal visible transparent animationType="none">
          <BadgeReveal badges={newBadges} onDismiss={() => setShowBadgeReveal(false)} />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const CAL_CELL = 38;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, paddingBottom: 120, gap: Spacing.gap },
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

  // Calendar
  calCard: { gap: Spacing.tight },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calTitle: { ...Typography.bodyMedium },
  calDayHeaders: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 2 },
  calDayLabel: { ...Typography.caption, color: Colors.secondaryText, width: CAL_CELL, textAlign: 'center' },
  calRow: { flexDirection: 'row', justifyContent: 'space-around' },
  calCell: {
    width: CAL_CELL, height: CAL_CELL, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  calCellDone: { backgroundColor: Colors.accent },
  calCellMissed: { backgroundColor: Colors.cardElevated },
  calCellToday: { borderWidth: 1.5, borderColor: Colors.accent },
  calDayNum: { ...Typography.caption, color: Colors.tertiaryText, fontSize: 12 },
  calDayNumToday: { color: Colors.accent },

  // Photos
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.tight },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...Typography.subheadline },
  sectionSub: { ...Typography.caption, color: Colors.secondaryText, marginTop: 1 },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accent + '18',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  addPhotoBtnText: { ...Typography.label, color: Colors.accent },

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

  // Stats overlay on image
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

  // Caption
  captionWrap: { paddingHorizontal: Spacing.inner, paddingTop: 10, paddingBottom: 4 },
  captionText: { ...Typography.body, color: Colors.primaryText },
  captionEllipsis: { color: Colors.secondaryText },
  captionMore: { ...Typography.bodyMedium, color: Colors.accent },

  photoCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.inner, paddingBottom: Spacing.inner, paddingTop: 6,
  },
  photoCardDate: { ...Typography.caption, color: Colors.secondaryText },

  // Detail modal
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

  // Add Photo sheet
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
  dateChipTextSelected: { color: Colors.white, fontFamily: 'DMSans-Medium' },
  sheetSaveBtn: {
    backgroundColor: Colors.accent, borderRadius: Radii.button,
    margin: Spacing.card, marginTop: Spacing.inner, paddingVertical: 14, alignItems: 'center',
  },
  sheetSaveBtnText: { ...Typography.bodyMedium, color: Colors.white },
});
