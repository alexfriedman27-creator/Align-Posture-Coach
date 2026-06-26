import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Switch, TouchableOpacity, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { Card } from '../../components/shared/Card';
import { BadgePicker } from '../../components/shared/BadgePicker';
import { DrumrollPicker } from '../../components/onboarding/DrumrollPicker';
import { Button } from '../../components/shared/Button';
import { useRouter, useFocusEffect } from 'expo-router';
import { purchasesService } from '../../lib/services/purchases';
import { useUserStore } from '../../lib/store/useUserStore';
import { useProgressStore } from '../../lib/store/useProgressStore';
import { usePlanStore } from '../../lib/store/usePlanStore';
import { getBadges, setPinnedBadge, unlockAllBadges } from '../../lib/db/queries';
import {
  Badge,
  CATEGORY_COLORS,
  getBadgeDefinition, BADGE_DEFINITIONS,
} from '../../types/Badge';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_MAP: Record<string, IoniconsName> = {
  'flame': 'flame', 'diamond': 'diamond', 'trophy': 'trophy', 'ribbon': 'ribbon',
  'medal': 'medal', 'star': 'star', 'calendar': 'calendar', 'calendar-outline': 'calendar-outline',
  'timer': 'timer', 'time': 'time', 'compass': 'compass', 'flask': 'flask',
  'checkmark-done': 'checkmark-done', 'checkmark-done-circle': 'checkmark-done-circle',
  'library': 'library', 'layers': 'layers', 'rocket': 'rocket', 'sparkles': 'sparkles',
  'pencil': 'pencil', 'hammer': 'hammer', 'camera': 'camera', 'images': 'images',
  'sunny': 'sunny', 'moon': 'moon', 'refresh': 'refresh', 'hourglass': 'hourglass',
  'play-circle': 'play-circle',
};

function badgeIconName(iconName: string): IoniconsName {
  return ICON_MAP[iconName] ?? 'ribbon';
}

function badgeCategoryColor(badge: Badge): string {
  const def = getBadgeDefinition(badge.id);
  return def ? CATEGORY_COLORS[def.category] : CATEGORY_COLORS.special;
}

function SettingRow({
  label,
  subtitle,
  value,
  rightLabel,
  onPress,
  toggle,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  value?: boolean;
  rightLabel?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSub}>{subtitle}</Text>}
      </View>
      {toggle !== undefined && onToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: Colors.accent, false: Colors.cardElevated }}
          thumbColor={Colors.white}
        />
      ) : rightLabel ? (
        <Text style={[Typography.bodyMedium, { color: Colors.accent }]}>{rightLabel}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={Colors.tertiaryText} />
      )}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard} padding={0}>
        {children}
      </Card>
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { profile, saveProfile, setReminderSet, resetAll, devFastMode, setDevFastMode } = useUserStore();
  const { loadProgress } = useProgressStore();
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgePickerVisible, setBadgePickerVisible] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<1 | 2 | 3>(1);
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerIsPM, setPickerIsPM] = useState(false);

  useFocusEffect(useCallback(() => {
    getBadges().then(setBadges);
  }, []));

  const slotBadge = badges.find((b) => b.isPinned === pickerSlot);
  const initials = (profile?.name ?? 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const reminderH = profile?.reminderHour ?? 8;
  const reminderM = profile?.reminderMinute ?? 0;
  const isPM = reminderH >= 12;
  const h12 = reminderH === 0 ? 12 : reminderH > 12 ? reminderH - 12 : reminderH;
  const reminderLabel = `${String(h12).padStart(2, '0')}:${String(reminderM).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

  function openBadgePicker(slot: 1 | 2 | 3) {
    setPickerSlot(slot);
    setBadgePickerVisible(true);
  }

  async function handlePinBadge(badgeId: string) {
    await setPinnedBadge(badgeId, pickerSlot);
    const updated = await getBadges();
    setBadges(updated);
  }

  function openReminderPicker() {
    const h24 = profile?.reminderHour ?? 8;
    const m = profile?.reminderMinute ?? 0;
    const pm = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    setPickerHour(h12);
    setPickerMinute(m);
    setPickerIsPM(pm);
    setReminderPickerVisible(true);
  }

  async function handleRestorePurchases() {
    try {
      const { isPro } = await purchasesService.restorePurchases();
      if (isPro && profile) await saveProfile({ ...profile, isPro: true });
    } catch {}
  }

  async function handleTogglePro() {
    if (!profile) return;
    await saveProfile({ ...profile, isPro: !profile.isPro });
  }

  async function handleDevReset() {
    await resetAll();
    await loadProgress();
    usePlanStore.setState({ plan: null, isLoaded: false });
  }

  async function handleUnlockBadges() {
    await unlockAllBadges(BADGE_DEFINITIONS);
    const updated = await getBadges();
    setBadges(updated);
  }

  async function saveReminderFromPicker() {
    const hour24 = pickerIsPM ? (pickerHour === 12 ? 12 : pickerHour + 12) : pickerHour === 12 ? 0 : pickerHour;
    await setReminderSet(hour24, pickerMinute);
    setReminderPickerVisible(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{profile?.name ?? 'You'}</Text>
              <Text style={styles.profileHandle}>@{profile?.username ?? 'align'} · Align {profile?.isPro ? 'Pro' : 'Free'}</Text>
            </View>
          </View>
          {profile?.isPro ? (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } })}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={12} color={Colors.white} />
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <SettingRow
            label="Notifications"
            subtitle="Enable all reminders"
            toggle={notifications}
            value={notifications}
            onToggle={setNotifications}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Daily reminder"
            subtitle={`Every day at ${reminderLabel}`}
            rightLabel={reminderLabel}
            onPress={openReminderPicker}
          />
        </Section>

        {/* Preferences */}
        <Section title="PREFERENCES">
          <SettingRow
            label="Sound effects"
            toggle={soundEffects}
            value={soundEffects}
            onToggle={setSoundEffects}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Haptic feedback"
            toggle={haptics}
            value={haptics}
            onToggle={setHaptics}
          />
        </Section>

        {/* Featured Badges */}
        <View style={styles.badgesSection}>
          <View style={styles.badgesHeader}>
            <Text style={styles.sectionTitle2}>Featured Badges</Text>
            {badges.length > 3 && (
              <Text style={[Typography.caption, { color: Colors.tertiaryText }]}>Tap slot to swap</Text>
            )}
          </View>
          {badges.length === 0 ? (
            <Text style={[Typography.body, { color: Colors.tertiaryText }]}>Complete sessions to earn badges.</Text>
          ) : (
            <View style={styles.badgeSlotsRow}>
              {([1, 2, 3] as const).map((slot) => {
                const badge = badges.find((b) => b.isPinned === slot);
                const color = badge ? badgeCategoryColor(badge) : Colors.tertiaryText;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.badgeSlot, badge ? { borderColor: color + '55' } : styles.badgeSlotEmpty]}
                    onPress={() => openBadgePicker(slot)}
                    activeOpacity={0.8}
                  >
                    {badge ? (
                      <>
                        <View style={[styles.badgeSlotIcon, { backgroundColor: color + '22' }]}>
                          <Ionicons name={badge.iconName as IoniconsName} size={26} color={color} />
                        </View>
                        <Text style={styles.badgeSlotName} numberOfLines={2}>{badge.name}</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.badgeSlotIconEmpty}>
                          <Ionicons name="add" size={22} color={Colors.tertiaryText} />
                        </View>
                        <Text style={styles.badgeSlotEmptyText}>Add badge</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Account */}
        <Section title="ACCOUNT">
          <SettingRow label="Privacy Policy" />
          <View style={styles.divider} />
          <SettingRow label="Terms of Service" />
          <View style={styles.divider} />
          <SettingRow label="Subscription & billing" />
          <View style={styles.divider} />
          <SettingRow label="Restore purchases" onPress={handleRestorePurchases} />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: Colors.danger }]}>Sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.tertiaryText} />
          </TouchableOpacity>
        </Section>

        {__DEV__ && (
          <Section title="DEVELOPER">
            <SettingRow
              label="Fast mode"
              subtitle="Skip exercises without waiting for timer"
              toggle={devFastMode}
              value={devFastMode}
              onToggle={setDevFastMode}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Pro plan"
              subtitle="Enable/disable pro features"
              toggle={!!profile?.isPro}
              value={!!profile?.isPro}
              onToggle={handleTogglePro}
            />
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={handleUnlockBadges} activeOpacity={0.7}>
              <Text style={styles.settingLabel}>Unlock all badges</Text>
              <Ionicons name="ribbon" size={16} color={Colors.tertiaryText} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={handleDevReset} activeOpacity={0.7}>
              <Text style={[styles.settingLabel, { color: Colors.danger }]}>Reset onboarding</Text>
              <Ionicons name="refresh" size={16} color={Colors.danger} />
            </TouchableOpacity>
          </Section>
        )}

        <Text style={styles.footer}>Align v1.0.0 · LLC</Text>
      </ScrollView>

      <BadgePicker
        visible={badgePickerVisible}
        badges={badges}
        pinnedId={slotBadge?.id ?? null}
        onPin={handlePinBadge}
        onClose={() => setBadgePickerVisible(false)}
      />

      <Modal
        visible={reminderPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReminderPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Daily reminder</Text>
            <Text style={styles.modalSub}>When should we nudge you each day?</Text>
            <View style={styles.modalPicker}>
              <DrumrollPicker
                hour={pickerHour}
                minute={pickerMinute}
                isPM={pickerIsPM}
                onHourChange={setPickerHour}
                onMinuteChange={setPickerMinute}
                onPMChange={setPickerIsPM}
              />
            </View>
            <View style={styles.modalFooter}>
              <Button label="Save" onPress={saveReminderFromPicker} />
              <TouchableOpacity onPress={() => setReminderPickerVisible(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.card, paddingTop: Spacing.inner, paddingBottom: 120, gap: Spacing.gap },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
  },
  avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.inner },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.subheadline, color: Colors.white },
  profileName: { ...Typography.subheadline },
  profileHandle: { ...Typography.caption, color: Colors.secondaryText, marginTop: 2 },
  proBadge: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  proBadgeText: { ...Typography.label, color: Colors.primaryText, letterSpacing: 1 },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent,
    borderRadius: Radii.chip,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 7,
  },
  upgradeButtonText: { ...Typography.label, color: Colors.white, letterSpacing: 0.5 },
  section: { gap: Spacing.micro },
  sectionTitle: { ...Typography.caption, color: Colors.secondaryText, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
  sectionCard: { overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.inner,
    paddingVertical: 14,
    gap: Spacing.inner,
  },
  settingLabel: { ...Typography.bodyMedium },
  settingSub: { ...Typography.caption, color: Colors.secondaryText, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.cardElevated, marginHorizontal: Spacing.inner },
  badgesSection: { gap: Spacing.tight },
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle2: { ...Typography.subheadline },
  badgeSlotsRow: { flexDirection: 'row', gap: Spacing.tight },
  badgeSlot: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.tight,
    borderWidth: 1.5,
    borderColor: Colors.cardElevated,
    minHeight: 118,
  },
  badgeSlotEmpty: {
    borderColor: Colors.cardElevated,
    borderStyle: 'dashed',
  },
  badgeSlotIcon: {
    width: 52,
    height: 52,
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSlotIconEmpty: {
    width: 52,
    height: 52,
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardElevated,
  },
  badgeSlotName: { ...Typography.caption, color: Colors.primaryText, textAlign: 'center' },
  badgeSlotEmptyText: { ...Typography.caption, color: Colors.tertiaryText, textAlign: 'center' },
  footer: { ...Typography.caption, color: Colors.tertiaryText, textAlign: 'center', marginTop: Spacing.micro },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radii.hero,
    borderTopRightRadius: Radii.hero,
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.inner,
    paddingBottom: Spacing.section,
    alignItems: 'center',
    gap: Spacing.inner,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cardElevated,
    marginBottom: Spacing.micro,
  },
  modalTitle: { ...Typography.subheadline },
  modalSub: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center' },
  modalPicker: { marginVertical: Spacing.inner },
  modalFooter: { width: '100%', gap: Spacing.tight },
  modalCancel: { alignItems: 'center', paddingVertical: Spacing.inner },
  modalCancelText: { ...Typography.body, color: Colors.secondaryText },
});
