import React, { useEffect, useRef, useState } from 'react';
import { View, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Poppins_800ExtraBold,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_400Regular,
} from '@expo-google-fonts/poppins';
import { initDb } from '../lib/db/schema';
import { useUserStore } from '../lib/store/useUserStore';
import { useProgressStore } from '../lib/store/useProgressStore';
import { useAuthStore } from '../lib/store/useAuthStore';
import { purchasesService } from '../lib/services/purchases';
import { Colors } from '../lib/design/colors';
import AlignLoadingScreen from '../components/AlignLoadingScreen';
import { configureNotificationHandler } from '../lib/notifications/notificationService';
import { refreshNotifications } from '../lib/notifications/refresh';

SplashScreen.preventAutoHideAsync();
// Show notifications while the app is foregrounded, too.
configureNotificationHandler();

// Pull the authoritative Pro entitlement from RevenueCat and reconcile the
// locally persisted `isPro` flag. RevenueCat is the source of truth; the local
// flag is only a cache. Caller must ensure purchasesService.isAvailable().
async function syncEntitlement(): Promise<void> {
  const isPro = await purchasesService.checkEntitlement();
  const currentProfile = useUserStore.getState().profile;
  if (currentProfile && isPro !== currentProfile.isPro) {
    await useUserStore.getState().saveProfile({ ...currentProfile, isPro });
  }
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { loadProfile, profile, isLoaded, isNew, clearIsNew } = useUserStore();
  const { loadProgress, progress } = useProgressStore();
  const { initAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    'Poppins-ExtraBold': Poppins_800ExtraBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-Regular': Poppins_400Regular,
  });

  // Hide native splash immediately when fonts are ready, then enforce minimum
  // display time so the animated loading screen completes at least one cycle.
  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();
    minTimerRef.current = setTimeout(() => setMinTimeElapsed(true), 2200);
    return () => {
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
    };
  }, [fontsLoaded]);

  useEffect(() => {
    async function init() {
      await initDb();
      await loadProfile();
      await loadProgress();
      const needsReload = await initAuth();
      if (needsReload) {
        // Reinstall detected: cloud data was pulled into SQLite, reload stores.
        await loadProfile();
        await loadProgress();
      }
      // Configure RevenueCat and sync subscription status on every launch.
      // isAvailable() is false in Expo Go, so this is a no-op during dev.
      // Configure unconditionally (not gated on auth) so the paywall can fetch
      // offerings even before the user has an account; pass the auth id when we
      // have one so purchases alias to the account.
      if (purchasesService.isAvailable()) {
        await purchasesService.initialize(useAuthStore.getState().user?.id ?? undefined);
        await syncEntitlement();
      }
      setDbReady(true);
      // Build the initial notification schedule from current state.
      refreshNotifications();
    }
    init();
  }, []);

  // Rebuild the schedule whenever the app returns to the foreground, so the
  // rolling 7-day horizon stays fresh and "trained today" suppression applies.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshNotifications();
        // Re-verify Pro entitlement against RevenueCat on resume, so a lapsed
        // or refunded subscription is reflected without a full app restart.
        if (purchasesService.isAvailable()) void syncEntitlement();
      }
    });
    return () => sub.remove();
  }, []);

  // Deep-link when a user taps a notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route as string | undefined;
      if (route === 'progress') router.push('/(tabs)/progress');
      else if (route === 'paywall') router.push({ pathname: '/(onboarding)/paywall', params: { directToPlan: '1' } });
      else router.push('/(tabs)');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !dbReady || !isLoaded || !minTimeElapsed) return;

    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';
    const inSetReminder = segments[0] === 'set-reminder';
    const inIntro = segments[0] === 'intro';
    const inSession = segments[0] === 'session';

    const hasCompletedSession = (progress?.totalSessions ?? 0) > 0;

    const hasName = (profile?.name ?? '') !== '';

    if (isNew && !inIntro) {
      clearIsNew();
      router.replace('/intro');
    } else if (!profile?.onboardingCompleted) {
      if (!hasName && !inOnboarding) {
        // Pre-session onboarding (goal + name) not done yet
        router.replace('/(onboarding)/goal');
      } else if (hasName && hasCompletedSession && !inOnboarding && !inSession) {
        // Session done and user has left the session screen — show paywall
        router.replace('/(onboarding)/paywall');
      } else if (hasName && !hasCompletedSession && !inTabs && !inSession) {
        // Goal + name done, waiting for first session
        router.replace('/(tabs)');
      }
    } else if (!inTabs && !inSetReminder && !inSession) {
      router.replace('/(tabs)');
    }
  }, [fontsLoaded, dbReady, isLoaded, minTimeElapsed, profile?.onboardingCompleted, profile?.name, progress?.totalSessions, isNew]);

  if (!fontsLoaded) {
    // Native splash is still covering the screen; render nothing visible.
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  if (!dbReady || !isLoaded || !minTimeElapsed) {
    return <AlignLoadingScreen />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="intro" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="library" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="create-exercise" options={{ presentation: 'modal' }} />
        <Stack.Screen name="set-reminder" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercise-detail" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="program-detail" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="custom-program-detail" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="create-program" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="daily-plan" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}
