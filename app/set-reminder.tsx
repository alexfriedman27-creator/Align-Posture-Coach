import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DrumrollPicker } from '../components/onboarding/DrumrollPicker';
import { Button } from '../components/shared/Button';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { useUserStore } from '../lib/store/useUserStore';
import { requestPermissions } from '../lib/notifications/notificationService';

export default function SetReminderScreen() {
  const router = useRouter();
  const { setReminderSet } = useUserStore();
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [loading, setLoading] = useState(false);

  function formatTime() {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m} ${isPM ? 'PM' : 'AM'}`;
  }

  async function handleSet() {
    setLoading(true);
    // Ask for notification permission here — this is the natural moment the user
    // has opted into reminders. setReminderSet then schedules the first batch.
    await requestPermissions();
    const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
    await setReminderSet(hour24, minute);
    router.replace('/(tabs)');
  }

  async function handleSkip() {
    await setReminderSet(8, 0);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications" size={28} color={Colors.white} />
        </View>

        <Text style={styles.heading}>Set your daily reminder</Text>
        <Text style={styles.sub}>
          Consistency builds streaks. Tell us when to nudge you each day.
        </Text>

        <View style={styles.pickerWrap}>
          <DrumrollPicker
            hour={hour}
            minute={minute}
            isPM={isPM}
            onHourChange={setHour}
            onMinuteChange={setMinute}
            onPMChange={setIsPM}
          />
        </View>

        <Text style={styles.selected}>
          Remind me at <Text style={{ color: Colors.accent }}>{formatTime()}</Text>
        </Text>
      </View>

      <View style={styles.footer}>
        <Button label="Set reminder" onPress={handleSet} loading={loading} />
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.card, paddingTop: Spacing.section, alignItems: 'center' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.inner,
  },
  heading: { ...Typography.title, textAlign: 'center', marginBottom: Spacing.tight },
  sub: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center', marginBottom: Spacing.section },
  pickerWrap: { alignItems: 'center', marginTop: Spacing.inner },
  selected: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center', marginTop: Spacing.card },
  footer: { paddingHorizontal: Spacing.card, paddingBottom: Spacing.card, gap: Spacing.tight },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.inner },
  skipText: { ...Typography.body, color: Colors.secondaryText },
});
