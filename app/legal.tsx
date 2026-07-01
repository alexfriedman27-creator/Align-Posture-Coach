import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/design/colors';
import { Typography } from '../lib/design/fonts';
import { Spacing } from '../lib/design/spacing';
import { Radii } from '../lib/design/radii';

const CONTACT_EMAIL = 'alexfriedman27@gmail.com';
const LAST_UPDATED = 'July 1, 2026';

type Block = { heading?: string; body?: string };
type Doc = { title: string; blocks: Block[] };

const PRIVACY: Doc = {
  title: 'Privacy Policy',
  blocks: [
    { body: `Last updated: ${LAST_UPDATED}` },
    {
      body: `This Privacy Policy explains how Align ("we", "us") handles information when you use the Align mobile app. We built Align to require as little personal information as possible.`,
    },
    {
      heading: 'Information we collect',
      body: `Align does not ask for your email address, phone number, or real identity to create an account. When you first open the app, we generate an anonymous account tied to a random identifier stored securely on your device. The only profile information we store is what you choose to enter in the app, such as a display name, your stated goal, and your reminder time.`,
    },
    {
      heading: 'How we use your information',
      body: `We use the information you enter to run the app: to personalize your daily plan, track your streaks, progress, and badges, and to schedule the reminders you turn on. We do not sell your information, and we do not use it for advertising.`,
    },
    {
      heading: 'Cloud storage and sync',
      body: `Your profile, progress, session history, and badges are stored on your device and backed up to our cloud provider (Supabase) so your data survives a reinstall or a new device. This data is associated only with your anonymous account identifier.`,
    },
    {
      heading: 'Data that stays on your device',
      body: `Progress photos and your custom programs are stored only on your device and are never uploaded to our servers.`,
    },
    {
      heading: 'Subscriptions',
      body: `Subscriptions are processed by the Apple App Store or Google Play, and managed through RevenueCat, which handles purchase validation. We never see or store your payment card details. These providers process purchase information under their own privacy policies.`,
    },
    {
      heading: 'Notifications',
      body: `Reminders and motivational nudges are scheduled and delivered locally on your device. We do not operate a push-notification server and do not track whether you open a notification.`,
    },
    {
      heading: 'Data retention and deletion',
      body: `You can delete your account and all associated data at any time from Settings under "Delete account & data". This removes your data from your device and from our cloud storage. Deletion is permanent and cannot be undone.`,
    },
    {
      heading: 'Children',
      body: `Align is not directed to children under 13, and we do not knowingly collect personal information from them.`,
    },
    {
      heading: 'Changes to this policy',
      body: `We may update this policy from time to time. Material changes will be reflected by updating the "Last updated" date above.`,
    },
    {
      heading: 'Contact',
      body: `If you have questions about this policy or your data, contact us at ${CONTACT_EMAIL}.`,
    },
  ],
};

const TERMS: Doc = {
  title: 'Terms of Service',
  blocks: [
    { body: `Last updated: ${LAST_UPDATED}` },
    {
      body: `These Terms of Service ("Terms") govern your use of the Align mobile app. By using Align, you agree to these Terms.`,
    },
    {
      heading: 'The service',
      body: `Align provides guided posture and mobility programs, daily plans, and progress tracking for general wellness and educational purposes.`,
    },
    {
      heading: 'Not medical advice',
      body: `Align is not a medical device and does not provide medical advice, diagnosis, or treatment. The content is for general informational purposes only. Always consult a qualified healthcare professional before starting any exercise program, and stop immediately if you feel pain, dizziness, or discomfort. You use the exercises at your own risk.`,
    },
    {
      heading: 'Your account',
      body: `Align creates an anonymous account tied to your device. You are responsible for the activity that occurs through your device. Because accounts are anonymous, we may be unable to recover your data if you lose access to your device without a working backup.`,
    },
    {
      heading: 'Subscriptions and billing',
      body: `Some features require a paid subscription ("Pro"). Subscriptions are billed through your Apple App Store or Google Play account and renew automatically unless canceled at least 24 hours before the end of the current period. You can manage or cancel your subscription in your App Store or Google Play account settings. Refunds are handled by Apple or Google under their policies.`,
    },
    {
      heading: 'Acceptable use',
      body: `You agree not to misuse the app, attempt to disrupt or reverse-engineer the service, or use it in a way that violates applicable law.`,
    },
    {
      heading: 'Disclaimer of warranties',
      body: `Align is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the app will be uninterrupted, error-free, or that results will meet your expectations.`,
    },
    {
      heading: 'Limitation of liability',
      body: `To the fullest extent permitted by law, we will not be liable for any indirect, incidental, or consequential damages, or for any injury arising from your use of the app.`,
    },
    {
      heading: 'Changes to these terms',
      body: `We may update these Terms from time to time. Continued use of the app after changes take effect constitutes acceptance of the updated Terms.`,
    },
    {
      heading: 'Contact',
      body: `Questions about these Terms? Contact us at ${CONTACT_EMAIL}.`,
    },
  ],
};

export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const content: Doc = doc === 'terms' ? TERMS : PRIVACY;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.title}>{content.title}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {content.blocks.map((block, i) => (
          <View key={i}>
            {block.heading && <Text style={styles.heading}>{block.heading}</Text>}
            {block.body && <Text style={styles.body}>{block.body}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.inner,
    paddingHorizontal: Spacing.card,
    paddingTop: Spacing.tight,
    paddingBottom: Spacing.inner,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.icon,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.headline },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.card,
    paddingBottom: Spacing.card * 2,
  },
  heading: {
    ...Typography.bodyMedium,
    fontSize: 17,
    lineHeight: 24,
    color: Colors.primaryText,
    marginTop: Spacing.card,
    marginBottom: Spacing.tight,
  },
  body: {
    ...Typography.body,
    color: Colors.secondaryText,
    lineHeight: 22,
    marginBottom: Spacing.tight,
  },
});
