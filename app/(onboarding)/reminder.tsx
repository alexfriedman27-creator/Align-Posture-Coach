import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { DrumrollPicker } from '../../components/onboarding/DrumrollPicker';
import { Button } from '../../components/shared/Button';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { useUserStore } from '../../lib/store/useUserStore';

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 4,
            width: i === step ? 28 : 18,
            borderRadius: 2,
            backgroundColor: i <= step ? Colors.accent : Colors.cardElevated,
          }}
        />
      ))}
    </View>
  );
}

export default function ReminderScreen() {
  const router = useRouter();
  const { updateReminder } = useUserStore();
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);

  function formatTime() {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m} ${isPM ? 'PM' : 'AM'}`;
  }

  function handleContinue() {
    const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
    updateReminder(hour24, minute);
    router.push('/(onboarding)/paywall');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>ALIGN</Text>
          <ProgressDots step={2} />
        </View>

        <Text style={styles.heading}>Daily reminder</Text>
        <Text style={styles.sub}>Consistency builds the streak. Set the time you want us to nudge you.</Text>

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
          Selected: <Text style={{ color: Colors.accent }}>{formatTime()}</Text>
        </Text>
      </View>

      <View style={styles.footer}>
        <Button label="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.card, paddingTop: Spacing.tight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.section,
  },
  wordmark: { ...Typography.label, fontSize: 14, letterSpacing: 4, color: Colors.primaryText },
  heading: { ...Typography.display, marginBottom: Spacing.tight },
  sub: { ...Typography.body, color: Colors.secondaryText, marginBottom: Spacing.section },
  pickerWrap: { alignItems: 'center', marginTop: Spacing.section },
  selected: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center', marginTop: Spacing.card },
  footer: { paddingHorizontal: Spacing.card, paddingBottom: Spacing.card },
});
