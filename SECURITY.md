# Security Notes

## Known / accepted advisories

### `uuid` bounds check (GHSA-w5hq-g745-h8pq) — moderate — ACCEPTED

`npm audit` reports 11 moderate advisories. They are **one** underlying issue:
a missing buffer bounds check in `uuid` (surfaced 11 times through Expo's
dependency tree).

- **Path:** `uuid` → `@expo/config-plugins` → `@expo/cli` / `@expo/prebuild-config`
  / `expo-splash-screen` plugin.
- **Why it's accepted:** this code runs at **build / prebuild time** on the dev
  or CI machine only. It is not part of the app bundle shipped to users. The bug
  triggers only when `uuid` is called with a caller-supplied output buffer with
  untrusted input, which the Expo tooling does not do — so there is no exploit
  path here.
- **Do NOT run `npm audit fix --force`:** it downgrades `expo` ~56 → 46 (a major,
  build-breaking change). Verified via dry run.
- **Remediation plan:** clears automatically when Expo ships a release that pulls
  a patched `@expo/config-plugins`. Re-check on the next `expo` upgrade.

Last reviewed: 2026-07-01.
