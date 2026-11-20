# Setup & Deployment

## 1. Install & run
```bash
npm install
cp .env.example .env.local      # fill in values below
npm run dev                     # http://localhost:3000 (service worker is disabled in dev)
npm run build && npm start      # production mode: SW, offline, push testable on localhost
npm test                        # unit tests (timezone, validation, retry rules)
```

## 2. Environment variables
| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Production URL (used for metadata / OG) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses RLS. Never `NEXT_PUBLIC_`. Mark *Sensitive* in Vercel |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | From `npm run vapid` |
| `VAPID_PRIVATE_KEY` | **server only** | From `npm run vapid`. Rotating it invalidates all subscriptions |
| `VAPID_SUBJECT` | server | `mailto:you@company.com` |
| `CRON_SECRET` | **server only** | ≥16 random chars (`openssl rand -hex 32`). The cron endpoint refuses to run without it |

## 3. VAPID keys
`npm run vapid` → copy *Public Key* to `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, *Private Key* to `VAPID_PRIVATE_KEY`. Generate once; keep stable.

## 4. Database
Supabase SQL editor (or `supabase db push`): run `supabase/migrations/0001_init.sql`.
It creates tables, enables RLS with **no client policies** (only the server's service role touches data), and the functions `claim_due_notifications` (atomic `FOR UPDATE SKIP LOCKED`), `refresh_notification_counts`, `rate_limit_hit`.

## 5. First organizer
1. Supabase → Authentication → Users → *Add user* (email + password). **Disable public sign-ups** (Authentication → Providers → Email → turn off "Allow new users to sign up").
2. Authorize them (this is what grants access, not merely having an account):
```sql
insert into public.organizers (user_id, email, role)
select id, email, 'admin' from auth.users where email = 'organizer@company.com';
```
3. Visit `/organizer`, sign in. Every API call re-verifies the JWT *and* the `organizers` row server-side.

## 6. Scheduler (important)
Scheduled notifications are rows in Postgres (`scheduled_for`, UTC). Something must call `GET /api/cron/dispatch` with `Authorization: Bearer $CRON_SECRET` regularly. The endpoint claims due jobs atomically, so extra/concurrent calls are harmless.

Options:
- **Vercel Cron** (`vercel.json`, per minute). *Verified from Vercel docs (2026-11-20): Pro supports once-per-minute. Hobby limits are inconsistent across Vercel's own pages* ([Cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing): once/day with ±1h precision; [Schedules limits](https://vercel.com/docs/schedules/limits): 15 min). **On Hobby the `* * * * *` schedule can fail the deployment**, so change it or use the option below. Vercel sends `CRON_SECRET` as the bearer automatically.
- **Supabase pg_cron + pg_net** (any Vercel plan, per minute): `supabase/cron-pg_cron.sql`. Replace domain and secret, run once. If you use this, delete `vercel.json`'s `crons`.
- Any external pinger (GitHub Actions cron has 5-min granularity).

Delivery is "at or shortly after" the scheduled time (tick granularity + push latency) and **never before**. No exact-second guarantee is made.
Retries: failed (429/5xx/network) devices retry after 1, 4, 16 minutes (4 attempts), then the job becomes `partially_failed`/`failed`. 404/410 endpoints are marked `expired` and excluded from future sends. Jobs stuck in `processing` for >5 minutes are reclaimed. A job sends only to devices without an `accepted` delivery, so retries never double-notify.

## 7. Deploy to Vercel
1. Push the repo, import into Vercel (framework: Next.js).
2. Add all env vars (Production + Preview as needed).
3. Deploy; HTTPS is automatic (required for service workers and push).
4. Update `NEXT_PUBLIC_SITE_URL`, redeploy.
`prebuild` stamps `public/sw.js` with the commit SHA so every deploy is detected as a service-worker update (users see a "Refresh" toast).

## 8. Editing content
Only `content/event.ts`. `null`/`[]` = unconfirmed → hidden in production, shown as a labelled placeholder in dev. Set `startTime: "HH:mm"` (IST) once announced and the countdown, calendar entries, hero and JSON-LD update. Add a venue photo in `public/venue/` and set `venue.photo`. Regenerate icons with `npm run icons`.

## 9. Production verification checklist
- [ ] `/` loads over HTTPS; Lighthouse PWA/Best-practices pass; no console errors
- [ ] `/manifest.webmanifest` OK; DevTools → Application shows installable, SW active
- [ ] Offline (DevTools offline) reload still shows event info
- [ ] `curl -i https://SITE/api/cron/dispatch` → **401**; with correct bearer → 200
- [ ] `/organizer` signed-out shows login only; a Supabase user *not* in `organizers` sees "Not authorised"; `curl -X POST /api/organizer/notifications` → 401
- [ ] Enable notifications on a real device → row in `push_subscriptions`
- [ ] Organizer "Send test to this device" arrives; tapping opens the site
- [ ] Send Now → delivery counts correct; double-click Send → one notification
- [ ] Schedule for +3 min with the dashboard **closed** → arrives after the time, never before
- [ ] Cancel a pending job → never sends; Unsubscribe on device → status `unsubscribed`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` / `VAPID_PRIVATE_KEY` absent from the browser bundle (`grep` the `.next/static` output)
