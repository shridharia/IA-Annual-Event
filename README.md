# 11 Years of Impact — event microsite & PWA

Next.js 16 (App Router) · TypeScript · Tailwind 4 · GSAP + ScrollTrigger + SplitText · Motion · Supabase · Web Push (VAPID).

- `docs/DESIGN.md` — reference audit, three creative directions, chosen direction ("The Doorway"), design system
- `docs/SETUP.md` — env vars, VAPID, database, organizer setup, scheduler, deployment, verification checklist
- `docs/TESTING.md` — what was verified, and manual device tests for the rest
- `content/event.ts` — **all editable event content** (no animation code to touch)
- `lib/motion/` — the reusable motion system (declarative `data-reveal`, `data-split`, `data-scrub-words`, `data-draw`, `data-parallax`)
- `app/organizer` + `app/api/*` — organizer portal, push APIs, cron dispatch
- `supabase/migrations` — schema, RLS, atomic job claiming

Quick start: `npm install && cp .env.example .env.local && npm run dev`
