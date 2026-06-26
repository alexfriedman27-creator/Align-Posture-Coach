import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { GoalCard } from '../../components/onboarding/GoalCard';
import { Button } from '../../components/shared/Button';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { UserGoal } from '../../types/UserProfile';
import { useUserStore } from '../../lib/store/useUserStore';

const GOALS: UserGoal[] = ['fixPosture', 'reducePain', 'moveAndFeel', 'lookConfident'];

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 1].map((i) => (
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

export default function GoalScreen() {
  const router = useRouter();
  const { updateGoal, profile } = useUserStore();
  const [selected, setSelected] = useState<UserGoal | null>(profile?.goal ?? null);

  function handleContinue() {
    if (!selected) return;
    updateGoal(selected);
    router.push('/(onboarding)/name');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>ALIGN</Text>
          <ProgressDots step={0} />
        </View>

        <Text style={styles.heading}>What's your main{'\n'}goal?</Text>

        <View style={styles.options}>
          {GOALS.map((goal) => (
            <GoalCard
              key={goal}
              goal={goal}
              selected={selected === goal}
              onPress={() => setSelected(goal)}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Continue" onPress={handleContinue} disabled={!selected} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.tight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.section,
  },
  wordmark: {
    ...Typography.label,
    fontSize: 14,
    letterSpacing: 4,
    color: Colors.primaryText,
  },
  heading: {
    ...Typography.display,
    marginBottom: Spacing.section,
  },
  options: {
    gap: Spacing.tight,
  },
  footer: {
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.card,
  },
});
