# CLAUDE.md

Guidance for Claude Code when working in this repository.

**IMPORTANT**: Always read https://docs.expo.dev/versions/v56.0.0/ before writing Expo-specific code.

## Commands

```bash
npm run start        # Expo dev server (iOS simulator)
npx tsc --noEmit    # type-check
npm install <pkg> --legacy-peer-deps   # react@19 conflicts with most peer deps
npx expo install <pkg>                 # preferred for Expo packages
```

**No web support** — `expo-sqlite` is native-only. **Managed workflow** — no `ios/` or `android/` dir; never run `expo run:ios` / `expo run:android`. Supabase credentials in `.env.local`: `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Terminology

UI says **"programs"**; code uses **"module"** (file names, types, DB tables). Never rename code identifiers — only UI strings.

Display label mappings (always use a map, never derive from the raw identifier):
- `thoracic_spine` → "Upper Back", `integration` → "Full Body", `awareness` → "Practice"
- `easy/moderate/hard` → "Beginner / Intermediate / Advanced"

`CUSTOM_PURPLE = '#B57BFF'` — used for the custom program chip and icon throughout.

## Navigation (expo-router)

`app/_layout.tsx` — init gate: waits for fonts, SQLite, store hydration, Supabase session, 2200ms min timer, then routes.

```
app/
  _layout.tsx              init gate + routing
  intro.tsx                first-install only
  (onboarding)/            goal → name → paywall → reminder
  (tabs)/                  index (Today), modules (Programs), progress, profile (href:null, gear icon)
  session.tsx              fullscreen modal { source, moduleId?, customProgramId? }
  daily-plan.tsx           fullscreen modal, preview of today's plan
  program-detail.tsx       fullscreen modal { moduleId }
  custom-program-detail.tsx fullscreen modal { programId }
  create-program.tsx       fullscreen modal { editId? }
  library.tsx              fullscreen modal
  exercise-detail.tsx      fullscreen modal { id, kind: 'builtin'|'custom' }
  create-exercise.tsx      sheet modal
  set-reminder.tsx         fullscreen modal
```

Routing order: `isNew` → intro → onboarding (goal/name) → tabs → (after first session) paywall → reminder → tabs. `!inSession` guard prevents routing while session completion screen is active. Paywall receives `{ directToPlan: '1' }` for in-app upgrades (calls `router.back()` on completion instead of going to reminder).

## Data layer

**SQLite** (`lib/db/`): `schema.ts` creates 9 tables via `CREATE TABLE IF NOT EXISTS`. New columns via `ALTER TABLE` at bottom (catch error if exists). `queries.ts` — all raw SQL, manual snake_case → camelCase mapping. No ORM.

**Tables**: `user_profile`, `user_progress`, `daily_plans`, `module_sessions`, `progress_photos`, `badges`, `custom_exercises`, `favorite_modules`, `custom_programs`

**Local-only** (never synced to Supabase): `custom_programs`, `favorite_modules`, `progress_photos`.

**Supabase** sync: write-through, fire-and-forget. All sync helpers no-op when unauthenticated. Remote tables mirror SQLite with added `user_id UUID`. `user_profile` / `user_progress` use auth UUID as PK (not local `'profile_1'` / `'progress_1'`).

**Static content**: `exercises.json` / `modules.json` via `ExerciseRepository` / `ModuleRepository` singletons. Always use repository methods — never filter raw JSON.

## State (Zustand)

Four stores hydrated before navigation: `useUserStore` (profile, isPro, isNew, onboardingCompleted), `useProgressStore` (progress — never null after init), `usePlanStore` (today's DailyPlan), `useAuthStore` (Supabase session). Use `useFocusEffect(useCallback(..., []))` for fresh data on tab re-entry.

## Core logic

**DailyPlanGenerator**: One exercise per slot (neck, shoulder_scapula, thoracic_spine, core_pelvis, hip). Globally deterministic — mulberry32 PRNG seeded by date string. 3-day cooldown. Cached in SQLite.

**SessionManager** — `persistSessionCompletion(source, exercises, durationSeconds, progress)`:
- `SessionSource`: `{ type: 'dailyPlan'; plan }` | `{ type: 'module'; moduleId }` | `{ type: 'customProgram'; programId }`
- XP: daily plan = 500 + streak×50; built-in module = 200/300/400 by intensity; custom program = 300; repeated same day = 100
- Only `dailyPlan` updates `streakDays` / `lastSessionDate`
- Custom program sessions stored in `module_sessions` with `programId` as `module_id`
- Badge checks run after every session via `checkAndAwardBadges`

**XP curve**: 100 levels, `XP_THRESHOLDS[i] = Math.round(200 * i^1.2)`.

## Program system

20 built-in modules (easy×5, moderate×10, hard×5). All Pro-gated — tapping a locked module goes directly to paywall. `INTENSITY_COLOR` defined locally in each screen that uses it.

**Custom programs** (`custprog_*` IDs): stored in `custom_programs`. `create-program.tsx` has drag-to-reorder via `PanResponder` (no gesture handler lib). `lib/utils/resolveExercises.ts` — `resolveExerciseIds(ids)` resolves mixed builtin + custom IDs; `customToExercise(c)` converts `CustomExercise` to `Exercise` shape (category defaults to `'stretch'`).

**Favorites** (`favorite_modules` table): stores both module IDs and `custprog_*` IDs. Today tab carousel resolves each ID to `PostureModule | CustomProgram`.

## Badge system (`types/Badge.ts`)

51 badges, 10 categories. `BadgeDefinition` (static) vs `Badge` (earned record in SQLite). `isPinned` is a number: 0 = not pinned, 1–3 = featured slot. `autoEquipNewBadge` shifts slots on earn. `module_completionist` filters out `custprog_*` IDs — only built-in module completions count.

## Session screen (`app/session.tsx`)

`Animated.Value` for progress ring. `hasAdvancedRef` guards against Strict Mode double-firing. Set/rep display pattern: `ex.reps ? (sets>1 ? ${sets}×${reps} reps : ${reps} reps) : (sets>1 ? ${sets}×${duration}s : ${duration}s)`. Badge reveal fires 1.8s after completion (XP bar animates first).

## Progress tab (`app/(tabs)/progress.tsx`)

Pro-gated. Reports section (after calendar): **Top Programs** leaderboard (module_sessions only, daily plans excluded, sorted by count, All Time / This Month toggle) + **Activity Insights** 2×2 grid (avg session, sessions this month, best day of week, XP this month).

## Design system

All tokens from `lib/design/` — never hardcode. `Colors.background = #0A0E17`, `Colors.accent = #2F6BFF`. When overriding `fontSize` beyond a Typography preset, also set `lineHeight` to avoid clipping.

## React Native layout rules

- No `gap` in horizontal `ScrollView` `contentContainerStyle` — use `marginRight` on children
- No `flexDirection: 'row'` in horizontal `ScrollView` `contentContainerStyle` — wrap chips in an inner `<View style={{flexDirection:'row'}}>`
- `useNativeDriver: true` for transforms/opacity; `false` for layout/color
- `allowFontScaling={false}` on small chips and labels
