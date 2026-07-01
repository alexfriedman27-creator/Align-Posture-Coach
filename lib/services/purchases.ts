// RevenueCat integration.
//
// The native module (react-native-purchases) requires an EAS development build —
// it is NOT available in Expo Go. When running in Expo Go, all methods degrade
// gracefully: initialize() is a no-op, checkEntitlement() returns false, and
// purchasePackage() simulates a successful purchase so the UI can be tested.
//
// SETUP CHECKLIST (one-time, before shipping to the stores):
//   1. Create a project at app.revenuecat.com
//   2. Add your iOS + Android apps and paste the public SDK keys below
//   3. Create products in App Store Connect + Google Play with the identifiers below
//   4. Create a "pro" entitlement in RevenueCat and attach both products to it
//   5. react-native-purchases autolinks (no config plugin needed on SDK 56 / v10)
//   6. Build a development client on a real device:
//        eas build --profile development --platform ios   (or android)

import { Platform } from 'react-native';

// Public SDK keys from app.revenuecat.com, supplied via .env.local:
//   EXPO_PUBLIC_RC_IOS_KEY=appl_...    (iOS keys start with "appl_")
//   EXPO_PUBLIC_RC_ANDROID_KEY=goog_... (Android keys start with "goog_")
//   EXPO_PUBLIC_RC_TEST_KEY=test_...    (RevenueCat Test Store, dev builds only)
const RC_PROD_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  default: '',
}) as string;

// In dev builds (__DEV__), prefer the Test Store key so the purchase flow can be
// exercised against RevenueCat's sandbox without real App Store / Play products.
// Falls back to the platform key if no test key is set. Release builds (TestFlight,
// App Store, Play) have __DEV__ === false and always use the real platform key.
const RC_TEST_KEY = process.env.EXPO_PUBLIC_RC_TEST_KEY;
const RC_API_KEY = (__DEV__ && RC_TEST_KEY ? RC_TEST_KEY : RC_PROD_KEY) as string;

// TODO: Match these to your product identifiers in App Store Connect + RevenueCat
export const RC_ANNUAL_PRODUCT_ID = 'com.align.pro.annual';
export const RC_MONTHLY_PRODUCT_ID = 'com.align.pro.monthly';
export const RC_ENTITLEMENT_ID = 'pro';

// Dynamic require so the module failing to load (Expo Go / not installed)
// is caught at runtime rather than crashing the app at import time.
let Purchases: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Purchases = require('react-native-purchases').default;
  // Verify the native bridge is actually linked (fails silently in Expo Go).
  if (typeof Purchases?.configure !== 'function') Purchases = null;
} catch {
  Purchases = null;
}

export const purchasesService = {
  isAvailable(): boolean {
    return Purchases !== null;
  },

  // appUserId is optional: when omitted, RevenueCat generates an anonymous ID.
  // Call Purchases.logIn(userId) later to alias anonymous purchases to an account.
  async initialize(appUserId?: string): Promise<void> {
    if (!Purchases) return;
    if (!RC_API_KEY) {
      if (__DEV__) {
        console.warn(
          '[RevenueCat] No API key for this platform. Set EXPO_PUBLIC_RC_IOS_KEY / ' +
            'EXPO_PUBLIC_RC_ANDROID_KEY in .env.local.'
        );
      }
      return;
    }
    try {
      Purchases.configure({ apiKey: RC_API_KEY, appUserID: appUserId });
    } catch (e) {
      if (__DEV__) console.warn('[RevenueCat] init failed:', e);
    }
  },

  async checkEntitlement(): Promise<boolean> {
    if (!Purchases) return false;
    try {
      const info = await Purchases.getCustomerInfo();
      return !!info?.entitlements?.active?.[RC_ENTITLEMENT_ID];
    } catch {
      return false;
    }
  },

  async getOfferings(): Promise<any | null> {
    if (!Purchases) return null;
    try {
      return await Purchases.getOfferings();
    } catch {
      return null;
    }
  },

  // Returns { success, isPro }. Throws only on unexpected errors (not user cancellation).
  async purchasePackage(pkg: any): Promise<{ success: boolean; isPro: boolean }> {
    if (!Purchases) {
      // Expo Go / dev fallback — simulate a successful purchase for UI testing.
      // Fail CLOSED in production: if the native module ever fails to link in a
      // release build, we must not silently grant Pro for free.
      if (__DEV__) return { success: true, isPro: true };
      return { success: false, isPro: false };
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPro = !!customerInfo?.entitlements?.active?.[RC_ENTITLEMENT_ID];
      return { success: true, isPro };
    } catch (e: any) {
      if (e?.userCancelled) return { success: false, isPro: false };
      throw e;
    }
  },

  async restorePurchases(): Promise<{ isPro: boolean }> {
    if (!Purchases) return { isPro: false };
    try {
      const info = await Purchases.restorePurchases();
      return { isPro: !!info?.entitlements?.active?.[RC_ENTITLEMENT_ID] };
    } catch {
      return { isPro: false };
    }
  },
};
