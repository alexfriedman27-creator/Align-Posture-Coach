# Align — Posture Coach

An offline-first posture coaching app built with React Native + Expo. No backend required — everything lives on device, with optional Supabase sync when signed in.

## What it does

Align gives users a personalized daily posture routine and a library of guided sessions targeting specific problem areas like forward head posture, rounded shoulders, and lower back stiffness.

- **Daily plan** — auto-generated each day, one exercise per body zone (neck, shoulders, upper back, core, hips), with a 3-day cooldown so exercises rotate and a global PRNG seed so all users get the same plan on any given date
- **Programs** — 20 curated programs (Beginner / Intermediate / Advanced) targeting specific posture patterns; Pro-gated
- **Custom programs** — Pro users can build their own programs from any mix of built-in and custom exercises, with drag-to-reorder and star to favorite
- **Exercise library** — browse and filter all 60+ built-in exercises by area and type; Pro users can create custom exercises
- **Progress & Reports** — XP, levels, streaks, 30-day calendar, top programs leaderboard, activity insights (avg session, XP this month, most active day), and before/after progress photos
- **Badges** — 51 earnable achievements across 10 categories; animated badge reveal with particle burst on unlock

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native (Expo SDK 56, New Architecture) |
| Navigation | expo-router (file-based) |
| Database | expo-sqlite (offline-first, no ORM) |
| Sync | Supabase (background, fire-and-forget) |
| State | Zustand (hydrated from SQLite at startup) |
| Fonts | Poppins (headings) + DM Sans (body) |
| Icons | Ionicons |

## Getting started

```bash
npm install --legacy-peer-deps
npm run start        # Expo dev server
npx tsc --noEmit    # Type-check
```

> **Note:** Web is not supported — `expo-sqlite` is native-only. Test on iOS Simulator or a physical device.

> **Dependency installs** require `--legacy-peer-deps` due to react@19 peer conflicts. Use `npx expo install <package>` for Expo packages.

> **Environment:** Copy `.env.local.example` to `.env.local` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The app works fully offline without these — sync is a no-op when unauthenticated.

## Project structure

```
app/
  (tabs)/              Today, Programs, Progress, Profile
  (onboarding)/        goal → name → paywall → reminder
  session.tsx          fullscreen session player
  program-detail.tsx   built-in program detail
  custom-program-detail.tsx  custom program detail (edit/delete/start)
  create-program.tsx   create or edit a custom program
  library.tsx          full exercise browser
  exercise-detail.tsx  exercise info
  daily-plan.tsx       daily plan preview
lib/
  db/                  SQLite schema + raw SQL queries (no ORM)
  data/                static JSON (exercises, modules) + repository singletons
  design/              design tokens (Colors, Typography, Spacing, Radii)
  services/            DailyPlanGenerator, SessionManager
  store/               Zustand stores (user, progress, plan, auth)
  utils/               resolveExercises — resolves mixed builtin/custom exercise ID arrays
  sync/                Supabase write-through helpers
types/                 canonical TypeScript interfaces + constants
components/            shared UI (Card, StatBlock, BadgeReveal, etc.)
```

## Architecture notes

- All data reads come from SQLite for instant UX. Supabase writes happen in the background after every session.
- `app/_layout.tsx` is the init gate — waits for fonts, DB init, store hydration, and a 2200ms minimum splash before routing.
- First-run flow: Intro → Goal → Name → Tabs → first session → Paywall → Reminder → Tabs.
- `useProgressStore.progress` is never null after init (defaults to zero-state).
- `custom_programs`, `favorite_modules`, and `progress_photos` are local-only and never synced to Supabase.
- Custom program sessions are stored in `module_sessions` with the `custprog_*` ID as `module_id`.
- Badge `isPinned` is a **number**: `0` = not pinned, `1–3` = featured slot index.
- See `CLAUDE.md` for full architecture details.

## License

Private — all rights reserved.
