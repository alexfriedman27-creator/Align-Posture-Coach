# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Expo SDK APIs have changed significantly. Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo-specific code.

## Commands

```bash
npm run start        # start Expo dev server (Expo Go)
npm run ios          # open on iOS simulator
npx tsc --noEmit    # type-check (no test runner configured)
```

**Dependency installs require `--legacy-peer-deps`** because react@19.2.3 conflicts with most packages' peer requirements:
```bash
npm install <package> --legacy-peer-deps
npx expo install <package>   # preferred for Expo packages
```

**Web is not supported** — `expo-sqlite` is native-only. Always test on iOS simulator.

**Managed workflow** — there is no `ios/` or `android/` directory. Never run `expo run:ios` / `expo run:android`, as these eject to bare workflow and create those directories.

**Environment**: Supabase credentials live in `.env.local` (gitignored). The file needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. These `EXPO_PUBLIC_` vars are baked into the bundle at build time.

## Terminology: "programs" vs "modules"

The UI says **"programs"** everywhere (tab title, badges, paywall copy, session header). The code uses **"module"** everywhere (file names, variable names, TypeScript types, DB tables, API params). Do not rename code identifiers — only change user-visible strings.

The same rule applies to exercise slots and categories — the code identifiers are fixed, only `SLOT_NAME` / `CATEGORY_LABEL` display strings change:
- `thoracic_spine` → "Upper Back" (not "Thoracic")
- `integration` → "Full Body" (not "Integration")
- `awareness` → "Practice" (not "Awareness")

Never use `category.charAt(0).toUpperCase() + category.slice(1)` to derive a category label — always use a `CATEGORY_LABEL` map so "awareness" renders as "Practice".

## Architecture

Align is a posture coach app. Data is stored locally in SQLite (offline-first, always reads from SQLite for snappy UX) and synced to Supabase in the background when the user is authenticated.

### Navigation (expo-router file-based)

`app/_layout.tsx` is the root init gate: waits for fonts, SQLite, store hydration, Supabase auth session restoration, and a minimum 2200ms display window, then routes based on state:

```
app/
  _layout.tsx              ← init gate + nav redirect
  intro.tsx                ← "How It Works" shown on fresh install only
  (onboarding)/            ← goal → name  (shown BEFORE first session)
                             paywall       (plan selection, shown AFTER first session)
                             reminder      (post-paywall reminder setup, first-time only)
  (tabs)/                  ← index (Today), modules.tsx (tab title: "Programs"), progress, profile (hidden)
  session.tsx              ← fullscreen modal, receives { source, moduleId? } params
  daily-plan.tsx           ← fullscreen modal, opened from Today tab hero card
  program-detail.tsx       ← fullscreen modal, receives { moduleId } params, opened from Programs tab
  set-reminder.tsx         ← fullscreen modal, opened from profile settings
  library.tsx              ← fullscreen modal, opened from Programs tab
  exercise-detail.tsx      ← fullscreen modal, receives { id, kind: 'builtin'|'custom' } params
  create-exercise.tsx      ← sheet modal for pro users to add custom exercises
```

**First-run flow**: fresh install → intro → goal → name → tabs (pulsing card) → complete session/program → paywall (plan selection) → reminder → tabs.

**Routing logic** (`_layout.tsx` useEffect):
- `isNew` (never visited) → `/intro`
- `!onboardingCompleted && !hasName` → `/(onboarding)/goal`
- `!onboardingCompleted && hasName && !hasCompletedSession` → `/(tabs)`
- `!onboardingCompleted && hasName && hasCompletedSession && !inSession` → `/(onboarding)/paywall`
- `onboardingCompleted` → `/(tabs)` (unless in session or set-reminder)

The `!inSession` guard prevents the routing effect from firing while the session completion screen is still showing — `handleDone` in `session.tsx` navigates to paywall explicitly when the user taps Done.

**Onboarding screens**: goal and name each show 2 progress dots (step 0 and 1). The paywall has no dots. Any new pre-session onboarding screen must update both goal.tsx and name.tsx dot counts.

**Paywall** (`app/(onboarding)/paywall.tsx`): plan selection screen. **Monthly is listed first** ($6.99/mo) and is the default selected plan. Annual ($39.99/yr) is listed second. The "BEST VALUE" badge on the annual card is always visible (not conditional on selection), positioned `top: 0` flush with the card top. Exercise and module counts displayed are derived dynamically from the repositories (`exerciseRepository.allExercises.length`, `moduleRepository.allModules.length`) so they stay accurate as content is added. `EXERCISE_COUNT` is the raw count; `EXERCISE_DISPLAY` rounds it down to the nearest 10 for the "60+" style used in the feature list — but the hero subtitle shows the exact count (`EXERCISE_COUNT`). "Restore Purchases" is **not** on the paywall — it lives in profile settings under Subscription & billing.

**In-app upgrade path**: When navigating to the paywall from inside the app (e.g. locked program tap, home screen upgrade card), pass `params: { directToPlan: '1' }`. The paywall reads this via `useLocalSearchParams` to call `router.back()` on completion instead of routing to the reminder screen.

### Today tab header + navigation

The profile tab is hidden from the tab bar (`href: null` in `(tabs)/_layout.tsx`) but remains a routable screen. Access to profile is via a settings gear icon in the Today tab header. Tab order: modules → index → progress.

### Today tab hero card (`app/(tabs)/index.tsx`)

The Daily Program card is the primary feature of the Today tab — it dominates the fold. Key design details:
- **Hero card** has a 3px solid accent-blue top border that stays accent-blue even after session completion (the only completion indicator is the green checkmark + "Done for today" text, not a border color change). Wrapped in an `Animated.View` that pulses the border for first-time users.
- **Two touch targets**: the outer `TouchableOpacity` navigates to `/daily-plan` (preview); the inner "Start" `TouchableOpacity` navigates directly to `/session` with `{ source: 'dailyPlan' }`. Nested touchables work correctly in RN — the inner one captures its own event.
- **Slot pills** are colored by the exercise's `category` (stretch=blue, strengthen=orange, mobility=green, awareness=purple), not a uniform grey. Each pill also shows the slot short-name below it.
- **Streak card** shows "Best: X days" (longest streak) always below the current streak count, even when both are 0, so new users understand the feature.
- **Streak color**: red/orange (`Colors.orange`) not blue — avoids confusion with the "Advanced" difficulty color.
- `CATEGORY_COLOR` is defined locally in each screen that needs it (index.tsx, daily-plan.tsx, program-detail.tsx, library.tsx) — there is no shared constant for this.
- **AlignMark** is inlined in index.tsx at `_MS = 0.44` for the upgrade card. The paywall uses `_MS = 0.52`. Constants are copied from `AlignLoadingScreen.tsx` and scaled.

### Startup / loading screen

`_layout.tsx` init sequence: fonts load → 2200ms minimum timer → `initDb()` → `loadProfile()` → `loadProgress()` → `initAuth()` (restores Supabase session) → show `AlignLoadingScreen` until all complete → route.

`components/AlignLoadingScreen.tsx` has the Align logo mark geometry constants (head circle + 4 tapering segments). The paywall and Today upgrade card inline their own copies at different scales (`_MS = 0.52` and `_MS = 0.44`). Always copy from `AlignLoadingScreen.tsx` as the source of truth.

### Data layer

**SQLite** (`lib/db/`):
- `schema.ts` — `initDb()` creates 8 tables via `CREATE TABLE IF NOT EXISTS`. Array fields are JSON strings; booleans are INTEGER 0/1. Add new columns via `ALTER TABLE` migration blocks at the bottom (catch the error if the column already exists).
- `queries.ts` — all raw SQL. Manually maps snake_case DB columns → camelCase TS fields. Never use an ORM; keep all SQL here.

**Tables**: `user_profile`, `user_progress`, `daily_plans`, `module_sessions`, `progress_photos`, `badges`, `custom_exercises`, `favorite_modules`.

**Supabase** (`lib/supabase.ts`): client initialised with AsyncStorage for session persistence. The remote schema mirrors the local SQLite tables with an added `user_id UUID` FK on multi-row tables (`daily_plans`, `module_sessions`, `badges`, `custom_exercises`). `user_profile` and `user_progress` use the auth UUID as their primary key (not the local `'profile_1'` / `'progress_1'` IDs). All tables have Row Level Security — users can only access their own rows.

**Static content** (`lib/data/`):
- `exercises.json` / `modules.json` are the source of truth for built-in content.
- `ExerciseRepository` and `ModuleRepository` are singletons initialized at startup. Always use `exerciseRepository.exercise(id)`, `exerciseRepository.exercisesForSlot(slot)`, or `exerciseRepository.allExercises` — never filter the raw JSON directly.
- **Exercise naming convention**: use plain-language names, not anatomical/clinical terms. "Face-Down" not "Prone", "Lying" not "Supine", "All Fours" not "Quadruped", "Shoulder Blade" not "Scapular", "Upper Back" not "Thoracic" (when used as a modifier). The slot/category already communicates the body area; the name should describe what the user does.

### State management (Zustand + SQLite)

Four stores, each hydrated before any navigation:
- `useUserStore` — `UserProfile`: name, goal, reminderHour/Minute, isPro, onboardingCompleted, reminderSet. Also holds `isNew` (fresh install flag), `devFastMode` (in-memory dev toggle, resets on restart). Every `saveProfile` / `completeOnboarding` / `setReminderSet` call syncs to Supabase in the background via `syncProfile()`.
- `useProgressStore` — `UserProgress`. `loadProgress()` always returns a non-null default (zero state) when no DB row exists — `progress` is never null after init. `saveProgress` syncs in background.
- `usePlanStore` — today's `DailyPlan`, lazy-generated on first access via `DailyPlanGenerator`.
- `useAuthStore` — Supabase `session` + `user`. `initAuth()` restores the persisted session and subscribes to `onAuthStateChange`. `signUp` / `signIn` / `signOut` are the only entry points for auth state changes.

Use `useFocusEffect(useCallback(..., []))` in screens that need fresh data when re-entering a tab.

### Sync layer (`lib/sync/supabaseSync.ts`)

**Write-through**: SQLite first, then fire-and-forget Supabase upsert. All sync helpers are no-ops when unauthenticated. `pushAllToSupabase` runs once after sign-up; `pullFromSupabase` runs after sign-in (maps remote UUIDs back to local `'profile_1'`/`'progress_1'` IDs). Progress photos and favorite modules are local-only, never synced.

### Core business logic

**`DailyPlanGenerator`** (`lib/services/`): Picks one exercise per `ExerciseSlot` (`DAILY_SLOTS` = neck, shoulder_scapula, thoracic_spine, core_pelvis, hip). The plan is **globally deterministic** — a mulberry32 PRNG seeded from the date string ensures every user gets the same 5 exercises on a given day. A **3-day cooldown** prevents an exercise from appearing again within 3 days (read from `getRecentDailyPlans(3)`; falls back to allowing recent exercises only if a slot has no cooldown-eligible candidates). Plans are cached in SQLite so generation only runs once per day.

**`SessionManager`** (`lib/services/`): Call `persistSessionCompletion(source, exercises, durationSeconds, progress)` when a session ends. Returns `{ xpEarned, updatedProgress, newBadges }`.
- XP: daily plan = 500 + (streakDays × 50); module = 200/300/400 by intensity, or 100 if already done today
- Inserts session/plan record first, then runs badge checks (so same-day module counts are accurate)
- `SessionSource` is either `{ type: 'dailyPlan'; plan }` or `{ type: 'module'; moduleId }`
- After writing to SQLite, fires background sync for progress, the plan/session record, and any newly awarded badges.

**Module completion model**: `module_sessions` stores one row per completion with `module_id + date`. Multiple completions on the same day each get their own row. The daily plan has binary complete/incomplete state (`completedAt` is null or a timestamp); modules track full history.

**XP curve** (`types/UserProgress.ts`): 100 levels, `XP_THRESHOLDS[i] = Math.round(200 * i^1.2)`. Level 2 = 200 XP, Level 10 ≈ 2,800 XP, Level 100 ≈ 49,600 XP.

### Program system (modules internally)

20 modules in `lib/data/modules.json`, displayed as a single list sorted beginner → intermediate → advanced in `app/(tabs)/modules.tsx` (tab title: "Programs"):

- **Easy / Beginner (5)**: seated/standing-only, no floor strength work
- **Moderate / Intermediate (10)**: quadruped, prone mobility, light strength, some balance
- **Hard / Advanced (5)**: prone Y-T-W-I series, side plank, deep neck protocol, dynamic core, balance/proprioception

`ModuleIntensity = 'easy' | 'moderate' | 'hard'`. `INTENSITY_LABEL` maps to 'Beginner' / 'Intermediate' / 'Advanced'. `INTENSITY_COLOR` (defined locally in `modules.tsx`) maps to green `#4EC97B` / blue `#4EA8FF` / orange `#FF7A33` for the difficulty chip.

**Pro gate**: All modules are locked for free users (`locked = !isPro` in `ModuleCard`). Tapping a locked module routes **directly to the paywall** — free users never see the program-detail screen. `TAILORED_MODULE_IDS` in `types/Module.ts` still categorizes modules for `ModuleRepository.tailoredModules` / `generalModules` but is not used for the lock check in the UI.

**Favorite modules**: Pro users can star any module in the Programs tab. Stars are stored in `favorite_modules` SQLite (local-only, not synced to Supabase). Query functions: `getFavoriteModuleIds` / `addFavoriteModule` / `removeFavoriteModule` in `queries.ts`. The Today tab shows starred modules in a horizontal carousel; free users see a full-height upgrade card instead.

### Badge system

Defined entirely in `types/Badge.ts`. Two distinct types:
- `BadgeDefinition` — static data: `id`, `name`, `description`, `iconName`, `category`. Lives in `BADGE_DEFINITIONS` (51 entries). Use `getBadgeDefinition(id)` to look one up.
- `Badge` — the earned record stored in SQLite: same fields minus `category`, plus `earnedDate` and `isPinned`. `isPinned` is a **number** (0 = not pinned, 1/2/3 = featured slot index). Category is always derived at render time via `getBadgeDefinition`.

Ten categories (`BadgeCategory`), each with a distinct color in `CATEGORY_COLORS`: streak (orange), sessions (blue), daily (purple), modules/programs (lime), exercises (cyan), time (emerald), level (gold), custom (pink), photo (rose), special (slate). `BADGE_CATEGORY_ORDER` sets display order. The `'modules'` category key is internal — its display name is `'Programs'`.

Badge checks run inside `SessionManager.checkAndAwardBadges` after every session. All DB queries are batched with `Promise.all`.

**`ICON_MAP`** (string → `IoniconsName`) is duplicated in `BadgePicker.tsx` and `profile.tsx` — keep both in sync when adding icon names.

**Featured badges** (profile + home screen): 3 slots, `isPinned === slotIndex`. When a new badge is earned it is automatically placed in slot 1 via `autoEquipNewBadge(badgeId)` in `queries.ts`, which shifts slot 2 → 3 and slot 1 → 2 (dropping whatever was in slot 3). `setPinnedBadge(badgeId, slot)` is the manual override used in the badge picker UI. Home screen reads badge icons with `useFocusEffect`.

### Session screen specifics

`app/session.tsx` uses `Animated.Value` for the progress ring. `hasAdvancedRef` guards against React 18 Strict Mode double-firing.

**Set/rep display**: wherever exercise duration is shown, use: `ex.reps ? (ex.sets > 1 ? \`${sets} × ${reps} reps\` : \`${reps} reps\`) : (ex.sets > 1 ? \`${sets} × ${duration}s\` : \`${duration}s\`)`. Applied in index.tsx, daily-plan.tsx, program-detail.tsx, session.tsx.

**Set tracking**: `currentSet` (1-indexed), `timedSetWaiting` is true when a timed set finishes but more sets remain — shows "Start Set N" button. Last set auto-advances. Rep exercises short-circuit the timer entirely.

`SetBurst`: 22 particles in category color + white, staggered 11ms, 680ms duration.

Badge reveal: `setShowBadgeReveal(true)` fires after 1.8s (XP bar animates first), then `BadgeReveal.tsx` Modal shows scrim + card spring + particle burst. Multiple badges advance with exit-enter sequence.

**Developer section** (profile.tsx, `__DEV__` only): Fast Mode toggle (in-memory), Pro Plan toggle (persisted), Unlock All Badges, Reset Onboarding (`resetAll()` wipes all 7 tables, sets `isNew: true`).

### Design system

All tokens in `lib/design/` — always import from there, never hardcode:
- `Colors` — dark theme, background `#0A0E17`, accent `#2F6BFF`
- `Typography` — Outfit (ExtraBold/Bold/SemiBold) for headings, DM Sans (Regular/Medium) for body. When overriding `fontSize` beyond a Typography preset's `lineHeight`, also set `lineHeight` explicitly — otherwise text tops get clipped (e.g. `Typography.title` has `lineHeight: 32`; using `fontSize: 36` without setting `lineHeight: 44` clips the ascenders).
- `Spacing`, `Radii`

### React Native layout gotchas (this RN/Arch version)

- **`gap` in horizontal `ScrollView` `contentContainerStyle`** does not work reliably. Use `marginRight` on child items instead.
- **Chip/pill rows in horizontal `ScrollView`**: do NOT put `flexDirection: 'row'` in `contentContainerStyle` — the New Architecture constrains content to screen width, squishing all chips. Instead wrap chips in an inner `<View style={{ flexDirection: 'row' }}>` inside the ScrollView.
- **Text scaling**: add `allowFontScaling={false}` to small UI labels (chips, badges) so system accessibility text size doesn't break layout.
- **`Animated` driver**: use `useNativeDriver: true` for transforms and opacity; use `useNativeDriver: false` for layout (width/height) and color/background changes.
- **`flex: 1` in ScrollView**: works when `contentContainerStyle` includes `flexGrow: 1` — a child with `flex: 1` then fills remaining screen space (used for the home screen upgrade card).
- **Footer pinned to bottom inside a flex container**: use `marginTop: 'auto'` on the footer view rather than a separate sibling outside the scroll container — avoids the blank gap that appears when content doesn't fill the screen.

### Exercise library (`library.tsx` + `exercise-detail.tsx`)

`library.tsx` shows all builtin + custom exercises in a flat `FlatList`, sorted alphabetically. Filter chips (AREA and TYPE rows) are also sorted alphabetically. Filters use `SlotFilter = ExerciseSlot | null` and `CategoryFilter = ExerciseCategory | null` — `null` means no filter applied (no "All" chip). Slot chips use accent blue when active; category chips use their own `CATEGORY_COLOR` entry. Clicking an active chip deselects it (sets back to `null`).

**Library pro gate**: Free users see a blue "Upgrade to unlock" pill badge (matching the module card lock style) instead of a chevron. Tapping navigates to paywall. Exercise detail is freely accessible from daily-plan and program-detail — only the library is gated.

`exercise-detail.tsx` receives `{ id, kind: 'builtin' | 'custom' }` params. For builtin exercises it calls `exerciseRepository.exercise(id)`; for custom it calls `getCustomExercises()` and finds by id. Shows: 16:9 placeholder area (category-color accent bar + slot badge), then description, numbered instructions, and setup (position/equipment — only shown when equipment is not `"none"`).

### Types

`types/` holds canonical shapes for all entities. Key constants in `types/Exercise.ts`:
- `ExerciseSlot` — 6 values including `'integration'` (not in DAILY_SLOTS but valid in library/custom)
- `DAILY_SLOTS` — the 5 slots used in daily plans
- `SLOT_BADGE` — abbreviations: NK, SH, TH, CO, HP, IN
- `SLOT_NAME` — display names: Neck, Shoulders, Upper Back, Core, Hips, Full Body
- `reps?: number` and `sets?: number` — optional fields on `Exercise`. Presence of `reps` signals rep-based UI in session screen. For multi-set timed exercises, `sets > 1` and `duration_seconds` is the **per-set** hold duration (not total).
