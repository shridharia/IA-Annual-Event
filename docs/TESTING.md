# Testing

## Verified automatically in development (2026-11-20)
| Area | Result |
|---|---|
| Unit tests (`npm test`) | 12 passing: IST↔UTC conversion, countdown math/completion, deep-link & image validation, subscription validation, backoff, status resolution |
| Type check / production build | `tsc --noEmit` clean; `/` is statically pre-rendered |
| SQL migration | Applied to a real Postgres 14 (Supabase `auth` schema/roles stubbed) |
| Atomic claiming | 8 concurrent sessions × 40 due jobs → 40 claims, each exactly once; `attempt_count` = 1 for all |
| Not-before / retry gating | Future-dated and future-retry jobs not claimed; due ones claimed; stale `processing` reclaimed after 5 min |
| Idempotency | Duplicate `idempotency_key` rejected by unique constraint |
| Rate limiter, RLS | 4th hit in window denied; `anon` role gets permission denied |
| Layout | No horizontal overflow at 320 / 390 / 1440 px; no console errors |
| PWA | Manifest, icons, OG image served; SW controls page; offline reload shows event info; unknown route offline falls back to cached page |
| Reduced motion | 0 elements hidden; content fully visible |
| No JS / animation failure | Content visible without JS; `motion-failed` safety class applied if GSAP fails to load |
| Keyboard | First Tab stop is "Skip to content"; countdown exposes an accessible label |

## NOT verifiable without credentials/devices (run these)
No Supabase project, VAPID keys, or physical devices were available, so the following are **implemented but unverified end-to-end**:
1. **Push subscribe → send → receive** (needs Supabase + VAPID): follow the SETUP checklist on Chrome desktop, Android Chrome, Edge, Firefox, Safari macOS.
2. **iOS**: requires iOS/iPadOS 16.4+. In Safari: Share → Add to Home Screen → open the Home Screen icon → Enable notifications → send a test from `/organizer`. Confirm that in a normal Safari tab the site says to install first.
3. **Android install prompt**: Chrome on Android, over HTTPS; wait ~20 s for the install banner; dismiss it and confirm it doesn't return for 30 days (`localStorage impact11:install-dismissed`).
4. **Scheduled send with dashboard closed**: schedule +3 min, close the tab, confirm delivery and `completed_at ≥ scheduled_for`.
5. **Failure handling**: unsubscribe a device from OS settings, send, confirm its row becomes `expired` and the job is `sent`; temporarily break `VAPID_PRIVATE_KEY` on Preview to see `failed` + retries at 1/4/16 min.
6. **Authorization**: user not in `organizers` → "Not authorised"; unauthenticated `curl` to `/api/organizer/*` → 401; cross-origin POST → 403.
7. **Real-device motion**: scroll performance on a mid-range Android; Lighthouse mobile run (target Performance ≥ 90).
8. **Screen readers** (VoiceOver/TalkBack) pass over hero, schedule, notification flow.

## Known limitations
- "Accepted" = accepted by the push service, not displayed. "Opens" are best-effort pings from the service worker.
- Dispatch runs inside one function invocation (45 s budget, 20 concurrent sends); very large audiences (many thousands) should move to a queue.
- Hobby-plan Vercel cron frequency: see SETUP §6.
