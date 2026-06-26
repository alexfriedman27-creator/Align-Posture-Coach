// RevenueCat integration.
//
// The native module (react-native-purchases) requires an EAS development build —
// it is NOT available in Expo Go. When running in Expo Go, all methods degrade
// gracefully: initialize() is a no-op, checkEntitlement() returns false, and
// purchasePackage() simulates a successful purchase so the UI can be tested.
//
// SETUP CHECKLIST (one-time, before shipping to the App Store):
//   1. Create a project at app.revenuecat.com
//   2. Add your iOS app and paste the public SDK key below
//   3. Create products in App Store Connect with the identifiers below
//   4. Create a "pro" entitlement in RevenueCat and attach both products to it
//   5. Run `npx expo install react-native-purchases` (requires --legacy-peer-deps)
//   6. Add the config plugin to app.json plugins array:
//        ["react-native-purchases", { "apiKey": "<YOUR_IOS_KEY>" }]
//   7. Build a development client: `eas build --profile development --platform ios`

// TODO: Replace with your iOS public SDK key from app.revenuecat.com
const RC_API_KEY_IOS = 'appl_REPLACE_WITH_YOUR_REVENUECAT_KEY';

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

  async initialize(appUserId: string): Promise<void> {
    if (!Purchases) return;
    try {
      Purchases.configure({ apiKey: RC_API_KEY_IOS, appUserID: appUserId });
    } catch (e) {
      console.warn('[RevenueCat] init failed:', e);
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
      // Expo Go fallback — simulate a successful purchase for UI testing.
      return { success: true, isPro: true };
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
