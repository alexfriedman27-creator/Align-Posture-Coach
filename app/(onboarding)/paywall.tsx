import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/shared/Button';
import { Colors } from '../../lib/design/colors';
import { Typography } from '../../lib/design/fonts';
import { Spacing } from '../../lib/design/spacing';
import { Radii } from '../../lib/design/radii';
import { useUserStore } from '../../lib/store/useUserStore';
import { UserProfile } from '../../types/UserProfile';
import {
  purchasesService,
  RC_ANNUAL_PRODUCT_ID,
  RC_MONTHLY_PRODUCT_ID,
} from '../../lib/services/purchases';
import { exerciseRepository } from '../../lib/data/ExerciseRepository';
import { moduleRepository } from '../../lib/data/ModuleRepository';

const EXERCISE_COUNT = exerciseRepository.allExercises.length;
const EXERCISE_DISPLAY = Math.floor(EXERCISE_COUNT / 10) * 10; // round down to nearest 10 for "60+" style label
const MODULE_COUNT = moduleRepository.allModules.length;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Align mark geometry (mirrors AlignLoadingScreen constants)
const _WIDTHS = [38, 31, 24, 18];
const _HEAD_R = 13;
const _SEG_H = 15;
const _SEG_GAP = 6;
const _SEG_RX = 6.5;
const _NECK_GAP = 7;
const _MS = 0.52; // scale to match original 72px icon height
const _stackH = _WIDTHS.length * _SEG_H + (_WIDTHS.length - 1) * _SEG_GAP;
const _totalH = _HEAD_R * 2 + _NECK_GAP + _stackH;
const _topOff = (140 - _totalH) / 2;
const _headCy = _topOff + _HEAD_R;
const _firstCy = _topOff + _HEAD_R * 2 + _NECK_GAP + _SEG_H / 2;

function AlignMark() {
  return (
    <View style={{ width: 100 * _MS, height: 140 * _MS, marginBottom: Spacing.inner }}>
      <View style={{
        position: 'absolute',
        left: (50 - _HEAD_R) * _MS,
        top: (_headCy - _HEAD_R) * _MS,
        width: _HEAD_R * 2 * _MS,
        height: _HEAD_R * 2 * _MS,
        borderRadius: _HEAD_R * _MS,
        backgroundColor: Colors.infoMuted,
      }} />
      {_WIDTHS.map((w, i) => {
        const cy = _firstCy + i * (_SEG_H + _SEG_GAP);
        return (
          <View key={i} style={{
            position: 'absolute',
            left: (50 - w / 2) * _MS,
            top: (cy - _SEG_H / 2) * _MS,
            width: w * _MS,
            height: _SEG_H * _MS,
            borderRadius: _SEG_RX * _MS,
            backgroundColor: Colors.accent,
          }} />
        );
      })}
    </View>
  );
}

const FEATURES: { icon: IoniconsName; label: string; sub: string }[] = [
  { icon: 'layers-outline',      label: `${MODULE_COUNT} Tailored Programs`,  sub: 'Beginner to advanced programs for every goal' },
  { icon: 'body-outline',        label: `${EXERCISE_DISPLAY}+ Guided Exercises`,  sub: 'Full library across all posture areas' },
  { icon: 'create-outline',      label: 'Custom Exercises',      sub: 'Build and save your own movements' },
  { icon: 'star-outline',        label: 'Favorite Programs',     sub: 'Star programs and access them from Today' },
  { icon: 'trending-up-outline', label: 'Full Progress History', sub: 'Track streaks, XP, and session history' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useUserStore();
  const { directToPlan } = useLocalSearchParams<{ directToPlan?: string }>();

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Never show the paywall to a user who already has Pro. This happens when they
  // upgraded earlier via a locked-feature tap (directToPlan grants Pro but doesn't
  // complete onboarding), so the post-session onboarding paywall would otherwise
  // ask them to pay again. Dismiss / finish onboarding instead of rendering.
  const alreadyPro = !!profile?.isPro;
  useEffect(() => {
    if (!alreadyPro) return;
    if (directToPlan) router.back();
    else finishOnboarding(true);
  }, [alreadyPro]);

  async function finishOnboarding(isPro: boolean) {
    if (directToPlan) {
      await saveProfile({ ...profile!, isPro });
      router.back();
      return;
    }
    const updated: UserProfile = { ...profile!, onboardingCompleted: true, isPro };
    await saveProfile(updated);
    router.replace('/set-reminder');
  }

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      // Expo Go / native module not linked: no real store to charge against, so
      // simulate a successful purchase for UI testing. This free grant must NEVER
      // run on a real build — gate it strictly on isAvailable().
      if (!purchasesService.isAvailable()) {
        await finishOnboarding(true);
        return;
      }

      const offerings = await purchasesService.getOfferings();
      if (offerings?.current) {
        // Match by RevenueCat package type first (store-independent: works with
        // Test Store "monthly"/"yearly" products and real com.align.pro.* products),
        // then fall back to product identifier, then to the first package.
        const targetType = selectedPlan === 'annual' ? 'ANNUAL' : 'MONTHLY';
        const targetId = selectedPlan === 'annual' ? RC_ANNUAL_PRODUCT_ID : RC_MONTHLY_PRODUCT_ID;
        const pkgs = offerings.current.availablePackages;
        const pkg =
          pkgs.find((p: any) => p.packageType === targetType) ??
          pkgs.find((p: any) => p.product.identifier === targetId) ??
          pkgs[0];

        if (pkg) {
          const result = await purchasesService.purchasePackage(pkg);
          if (!result.success) {
            setLoading(false);
            return;
          }
          await finishOnboarding(result.isPro);
          return;
        }
      }

      // Native module is present but offerings/packages couldn't be resolved
      // (misconfiguration or network). Surface an error instead of granting Pro.
      setError('Subscriptions are unavailable right now. Please try again.');
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? 'Purchase failed. Please try again.');
      setLoading(false);
    }
  }


  // Already Pro: render nothing while the effect above redirects, so the paywall
  // content never flashes on screen.
  if (alreadyPro) return <View style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <AlignMark />
          <Text style={styles.heading}>Unlock Align Pro</Text>
          <Text style={styles.sub}>
            All {EXERCISE_COUNT} exercises, every tailored program, and custom exercise creation.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planSub}>Billed every month</Text>
              </View>
              <Text style={styles.planPrice}>$6.99</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.bestValue}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planSub}>$3.33/mo, billed annually</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>$39.99</Text>
                <Text style={styles.savingsBadge}>Save 52%</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          <Button
            label={selectedPlan === 'annual' ? 'Subscribe for $39.99/yr' : 'Subscribe for $6.99/mo'}
            onPress={handleSubscribe}
            loading={loading}
          />
          <TouchableOpacity
            onPress={() => finishOnboarding(false)}
            style={styles.skipLink}
            disabled={loading}
          >
            <Text style={styles.skipText}>Continue without Pro</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.card, paddingTop: Spacing.tight },
  hero: { alignItems: 'center', marginTop: Spacing.inner, marginBottom: Spacing.inner },
  heading: { ...Typography.title, textAlign: 'center', marginBottom: Spacing.tight },
  sub: { ...Typography.body, color: Colors.secondaryText, textAlign: 'center' },
  features: { gap: 2, marginBottom: Spacing.inner },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
    paddingVertical: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { ...Typography.bodyMedium, color: Colors.primaryText },
  featureSub: { ...Typography.caption, color: Colors.secondaryText, marginTop: 1 },
  plans: { gap: Spacing.tight },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.inner,
    borderWidth: 1.5,
    borderColor: Colors.cardElevated,
  },
  planCardSelected: { borderColor: Colors.accent },
  bestValue: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.inner,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bestValueText: { ...Typography.label, color: Colors.white, letterSpacing: 1 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { ...Typography.bodyMedium, color: Colors.primaryText },
  planSub: { ...Typography.caption, color: Colors.secondaryText, marginTop: 2 },
  planPrice: { ...Typography.subheadline, color: Colors.primaryText },
  savingsBadge: { ...Typography.label, color: Colors.accent, fontSize: 11, marginTop: 2 },
  errorText: { ...Typography.caption, color: Colors.danger, textAlign: 'center', marginTop: Spacing.inner },
  footer: { marginTop: 'auto', paddingTop: Spacing.inner, paddingBottom: Spacing.card },
  skipLink: { marginTop: Spacing.inner, alignItems: 'center' },
  skipText: { ...Typography.body, color: Colors.secondaryText },
});
