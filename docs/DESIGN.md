# 11 Years of Impact — Research, Direction & Design System

## Phase 1A — Reference audit (https://impact11years.vercel.app/, fetched 2026-11-20)

Verified:
| Area | Finding |
|---|---|
| Event | "11 Years of Impact", 17 December 2026, Hilton Embassy Tech Village, Bangalore |
| Nav | Home, The event, Schedule, Venue, Reminders (in-page anchors) |
| Organizer | "Organizer login" is an in-page `#admin` anchor. `/organizer`, `/admin`, `/login` all 404 |
| PWA | `/manifest.webmanifest` (standalone, portrait, theme `#264CD7`), `/sw.js` (`impact-events-v2`, network-first, offline shell) |
| Push | SW has `push` + `notificationclick` handlers (payload: title, body, tag, url). No `/api/*` names visible |
| Content | **No** start time, street address, agenda, or speakers found in extracted text |

Not verifiable: page scripts, whether the SW is registered, the reminders UI, icon files, the logo.
Treated as a **functional/content reference only**. Retained ideas: offline shell, push reminders, tap-to-open, standalone install, theme colour `#264CD7` (used as the brand cobalt here).

Missing information (rendered as editable placeholders, never invented): start/end time, agenda, speakers, street address, parking/transport, dress code, contact, FAQs, venue photography.

## Phase 1B — Three directions

### A. "The Doorway" (cinematic dark) — **recommended**
- **Concept**: Two colossal vertical "1" monoliths. The space *between* them is a lit doorway. As you scroll, the monoliths part and the doorway opens onto the story.
- **Palette**: ink `#0A0B10`, bone `#F1ECE2`, cobalt `#264CD7` / volt `#5B7CFF`, flare `#FF6A3D` (single warm accent).
- **Type**: Anton (display numerals/headlines), Instrument Serif italic (editorial voice), Manrope (UI/body).
- **Hero**: Two glyphs filled by a pointer-driven light; date + venue anchored in the baseline row, never behind animation.
- **Motion**: Masked line reveals, scroll-scrubbed parting of the 1s, word-by-word ignition of the statement, timeline line that draws.
- **Sections**: Full-bleed, hairline rules and numbered chapters instead of cards.
- **Mobile**: Monoliths scale to `62vw`, info stacks below, bottom dock navigation like a native app.

### B. "The Printed Programme" (editorial light)
- **Concept**: Warm paper, swiss-grid, a giant serif "11" used as a window (image mask) onto photography.
- **Palette**: paper `#EFE9DD`, ink `#111`, cobalt `#264CD7`.
- **Type**: Fraunces display, Inter Tight text.
- **Hero**: Cropped "11" mask with crop marks & registration ticks.
- **Motion**: Page-turn style wipes, gentle parallax.
- **Mobile**: Single column magazine. Needs real photography to shine (none is licensed/provided) → risky.

### C. "Night Signal" (festival / electric)
- **Concept**: "11" drawn as two neon tubes (SVG stroke animation) over a perspective grid.
- **Palette**: black, violet `#7C3AED`, acid lime `#C6FF3D`.
- **Type**: Space Grotesk + mono labels.
- **Motion**: Constant glow pulses, marquee strips.
- **Mobile**: Strong, but constant glow and marquees conflict with the "no constant motion" rule and read as a generic gig template.

### Recommendation
**A — The Doorway.** Highest emotional impact and originality (the *negative space* of 11 is the interaction, not just the glyph), the best readability (high-contrast type on ink), the lowest performance cost (two DOM glyphs, transforms only, no WebGL), and it needs no photography. B depends on imagery we don't have; C leans on perpetual motion. The prototype is the shipped hero in `components/site/Hero.tsx`.

## Phase 2 — Design system

### Colour tokens (`app/globals.css`)
`--ink #0A0B10` base · `--ink-2 #12141C` raised · `--bone #F1ECE2` primary text · `--dim #A3A9BC` secondary text (≥7:1 on ink) · `--cobalt #264CD7` · `--volt #6D8BFF` text accents (≥5.5:1) · `--flare #FF6A3D` highlights / key moments (≥6.5:1) · `--line rgba(241,236,226,.14)` hairlines.

### Typography scale (all fluid, `clamp()`)
`mega` clamp(9rem, min(58svh,64vw), 44rem) · `display` clamp(2.6rem, 9vw, 8rem) · `title` clamp(1.9rem, 5vw, 4rem) · `lead` clamp(1.15rem, 2.2vw, 1.6rem) · `body` 1rem/1.65 · `label` .75rem uppercase +.18em tracking.

### Spacing
4-pt base. Section padding `clamp(5rem, 12vw, 10rem)` block; page gutter `max(1rem, env(safe-area-inset-*))` → `clamp(1rem, 4vw, 3rem)`. Max measure 62ch.

### Component patterns
Chapter header (number + label + hairline) · Hairline list rows (schedule/info/FAQ) · Pill button (primary = bone on ink, secondary = outline) · Bottom dock (mobile) / top bar (desktop) · Sheet (install/notify, Motion-driven).
No card grids; separation is by hairlines and scale.

### Animation principles
1. Motion explains structure: reveals show hierarchy, scroll-scrub shows *the doorway opening*.
2. One vocabulary: masked rise (`data-reveal="mask"`), fade-up (`up`), stagger children (`stagger`), word ignition (`scrub-words`), line draw (`draw`). Declared in markup via `data-*`; implemented once in `lib/motion`.
3. Transforms + opacity only; no layout properties are animated.
4. Native scroll always. No scroll-jacking, no pinning on mobile.
5. Content is visible without JS and under `prefers-reduced-motion`; hidden initial states exist only when JS runs *and* motion is allowed (safety timeout reveals everything).
6. Everything lives in a `gsap.context`/`matchMedia` and is reverted on unmount.

### Responsive rules
Mobile-first; breakpoints 480 / 768 / 1100 / 1600. 320px is a first-class target (no fixed-width elements, `min-width:0` on flex children). Touch targets ≥ 44px. Bottom dock replaces top links below 768px. `100svh` rather than `100vh`. Safe-area insets on dock, sheets, hero.
