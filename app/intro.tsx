import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: IoniconsName; iconColor: string; title: string; description: string }[] = [
  {
    icon: 'body',
    iconColor: '#2F6BFF',
    title: 'Daily Posture Reset',
    description: 'Complete a guided 5-minute session each day to build strong, lasting posture habits',
  },
  {
    icon: 'flame',
    iconColor: '#FF7A33',
    title: 'Earn XP & Level Up',
    description: 'Build streaks, earn achievements, and watch your level grow with every session',
  },
  {
    icon: 'layers',
    iconColor: '#4EC97B',
    title: 'Targeted Programs',
    description: 'Follow programs built around your specific problem areas, like neck, shoulders, and core',
  },
  {
    icon: 'notifications',
    iconColor: '#B57BFF',
    title: 'Stay on Track',
    description: 'Set a daily reminder to keep your routine consistent and build a lasting habit',
  },
];

export default function IntroScreen() {
  const router = useRouter();

  function proceed() {
    router.replace('/(onboarding)/goal');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.title}>How It Works</Text>
          <Text style={styles.subtitle}>Everything you need to fix your posture for good</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.iconWrap, { backgroundColor: f.iconColor + '22' }]}>
                <Ionicons name={f.icon} size={26} color={f.iconColor} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={proceed} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={proceed} style={styles.continueBtn}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.section,
    gap: Spacing.section,
  },
  top: { gap: Spacing.tight },
  title: {
    ...Typography.display,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.secondaryText,
  },
  features: { gap: Spacing.inner },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    gap: Spacing.inner,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { ...Typography.bodyMedium },
  featureDesc: { ...Typography.body, color: Colors.secondaryText, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.section,
    paddingTop: Spacing.inner,
  },
  skipBtn: { paddingVertical: Spacing.inner, paddingRight: Spacing.inner },
  skipText: { ...Typography.body, color: Colors.secondaryText },
  continueBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radii.button,
    paddingHorizontal: 36,
    paddingVertical: 16,
  },
  continueText: {
    ...Typography.bodyMedium,
    color: Colors.background,
    fontSize: 16,
  },
});
