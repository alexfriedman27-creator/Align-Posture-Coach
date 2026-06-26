import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/shared/Button';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { useUserStore } from '../../lib/store/useUserStore';
import { UserProfile } from '../../types/UserProfile';

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

export default function NameScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useUserStore();
  const [name, setName] = useState('');

  async function persist(displayName: string) {
    const trimmed = displayName.trim();
    const updated: UserProfile = {
      ...profile!,
      name: trimmed,
      username: trimmed.toLowerCase().replace(/\s+/g, '') || 'align',
      onboardingCompleted: false,
    };
    await saveProfile(updated);
    router.replace('/(tabs)');
  }

  function handleContinue() {
    if (!name.trim()) return;
    persist(name);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.wordmark}>ALIGN</Text>
            <ProgressDots step={1} />
          </View>

          <Text style={styles.heading}>What should we{'\n'}call you?</Text>
          <Text style={styles.sub}>We'll use your name to personalize your experience.</Text>

          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor={Colors.tertiaryText}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            maxLength={30}
          />
        </View>

        <View style={styles.footer}>
          <Button label="Continue" onPress={handleContinue} disabled={!name.trim()} />
          <Button label="Skip" variant="text" onPress={() => persist('')} />
        </View>
      </KeyboardAvoidingView>
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
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 18,
    ...Typography.headline,
    color: Colors.primaryText,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    marginTop: Spacing.section,
  },
  footer: { paddingHorizontal: Spacing.card, paddingBottom: Spacing.card, gap: Spacing.tight },
});
