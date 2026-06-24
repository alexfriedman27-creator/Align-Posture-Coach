# Align — Posture Coach

An offline-first posture coaching app built with React Native + Expo. No backend, no account required — everything lives on device.

## What it does

Align gives users a personalized daily posture routine (5 exercises, one per body zone) and a library of guided sessions targeting specific problem areas like forward head posture, rounded shoulders, and lower back stiffness.

- **Daily plan** — auto-generated each day, weighted toward the user's problem areas, with cooldown logic so exercises rotate
- **Modules** — curated programs (e.g. "Office Worker Fix", "Morning Wake-Up") with beginner/intermediate/advanced intensity tiers
- **Exercise library** — browse and filter all 60+ built-in exercises; Pro users can create custom ones
- **Progress tracking** — XP, levels, streaks, 30-day session history, and 51 earnable badges
- **Badge reveal** — animated achievement overlays with shareable cards when new badges are unlocked

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native (Expo SDK 56, New Architecture) |
| Navigation | expo-router (file-based) |
| Database | expo-sqlite (offline, no ORM) |
| State | Zustand (hydrated from SQLite at startup) |
| Fonts | Outfit (headings) + DM Sans (body) |
| Icons | Ionicons |

## Getting started

```bash
npm install --legacy-peer-deps
npm run start        # Expo Go (scan QR)
npm run ios          # iOS Simulator
npx tsc --noEmit    # Type-check
```

> **Note:** Web is not supported — `expo-sqlite` is native-only. Test on iOS Simulator or a physical device via Expo Go.

> **Dependency installs** require `--legacy-peer-deps` due to react@19 peer conflicts. Use `npx expo install <package>` for Expo packages.

## Project structure

```
app/               expo-router screens
  (tabs)/          main tab bar (Today, Modules, Progress, Profile)
  (onboarding)/    goal → name → paywall flow
  session.tsx      fullscreen session player
  library.tsx      exercise browser
  exercise-detail  exercise info page
lib/
  db/              SQLite schema + raw SQL queries
  data/            static JSON (exercises, modules) + repository singletons
  design/          design tokens (Colors, Typography, Spacing, Radii)
  services/        DailyPlanGenerator, SessionManager
  store/           Zustand stores (user, progress, plan)
types/             canonical TypeScript interfaces + constants
components/        shared UI components
```

## Architecture notes

- All data is stored in SQLite. There is no network layer, auth, or cloud sync.
- `app/_layout.tsx` is the init gate: waits for fonts + DB + store hydration before routing.
- First-run flow: Intro → Goal → Name → Tabs → first session → Paywall → Set Reminder → Tabs.
- `useProgressStore.progress` is never null after init (defaults to zero-state).
- Badge `isPinned` is a **number**: `0` = not pinned, `1–3` = featured slot index.
- See `CLAUDE.md` for full architecture details (intended for AI assistants, but useful for humans too).

## License

Private — all rights reserved.
