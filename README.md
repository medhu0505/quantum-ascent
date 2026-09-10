# Quantum V2.0

The event site for Quantum V2.0, the inter-school tech and culture fest at
A.F.S. Bal Bharati School, Lodhi Road, New Delhi.

Built on the repo's existing stack: TanStack Start, Vite, Tailwind v4, shadcn/ui.

```bash
npm install
npm run dev      # http://localhost:8080
npm run build
npm run lint
```

## Before this goes live

Everything below is unconfirmed data, not unfinished code. Each one is a single
value in `src/data/quantum.ts`, and each renders as a visible "to be confirmed"
badge until it is replaced — a missing phone number should look missing rather
than look like a phone number.

| Value | Where | What breaks until it is set |
| --- | --- | --- |
| `REGISTRATION_FORM_URL` | `src/data/quantum.ts` | The registration form validates but cannot submit. The page says so plainly and the submit button is disabled. **This is the one that matters most.** |
| `team` roster | `src/data/quantum.ts` | Meet the Team shows real roles with the names badged as pending. |
| `contact` | `src/data/quantum.ts` | Contact page and footer show badges instead of an email, phone and handle. |
| `FEST_DATES` | `src/data/quantum.ts` | Not currently rendered; wire it in once dates are public. |
| `BROCHURE_URL` | `src/data/quantum.ts` | Not currently rendered. |

Event copy, FAQ answers and the About editorial are final — no placeholders there.

**Confirm the school's name.** The brief for this work said "F.S. Bal Bharati
School"; the repo already said "Air Force Bal Bharati School" in one place and
"A.F.S. Bal Bharati School" in another. The site currently uses **A.F.S. Bal
Bharati School** throughout, from `school.name`. Change it in one place if that
is wrong.

## Structure

```
/                  Scroll-scrubbed descent, ending at the crossroads hub
/events            Events interior — six screens, one per event
/register          Register interior — one terminal
/register/form     The registration form
/team              Meet the Team interior
/resources         Resources interior — FAQ, About, Contact
/faq /about /contact
```

Two visual registers, deliberately opposed. Scenes (hero, hub, interiors) are
full-bleed, neon and kinetic. The conventional pages are one quiet column at a
readable measure, because someone checking what to bring the night before the
fest wants the answer, not atmosphere.

## The film

`public/media/descent.mp4` — 10.006 s, 1280×720, 24 fps, H.264, no audio.

Re-encoded from the supplied master. Two changes, both load-bearing:

- **Audio stripped.** The hero is muted, so it was 160 KB of nothing.
- **A keyframe every 4 frames.** The supplied file had **one keyframe in 240
  frames**, so every scrub seek decoded from frame zero. Sixty keyframes make
  seeks land in roughly 0.17 s, and the file is 44% smaller than the master
  (2.7 MB, down from 4.8 MB).

Beat boundaries were measured, not estimated — per-frame luma delta across all
240 frames, so each boundary sits where the camera's rate of change actually
breaks. They live in `timeline` in `src/data/quantum.ts`:

| Beat | Seconds |
| --- | --- |
| Wide aerial — moon, beam, skyline | 0.00 – 2.40 |
| Skyscraper canyon of billboard panels | 2.40 – 7.00 |
| Deceleration into the crossroads | 7.00 – 9.50 |
| Camera holds | 9.50 – 10.006 |

Only H.264 ships. A VP9/WebM alternate was encoded and measured at 3.46 MB —
larger than the H.264, because this grade is mostly flat gradients — so it was
dropped rather than shipped as a heavier "optimisation".

## Scenes and hotspots

The crossroads plate is the film's **literal final frame**, so arriving from
the scrubbed video is a cut between identical pixels rather than a match that
has to be eyeballed.

The four signboards are DOM elements welded onto real blank billboards in that
frame. Their geometry was measured off the plate and is stored as percentages
of the 1280×720 source in `scenes[].sign`. To move a sign, change those
numbers; nothing else needs to know.

Interiors are composed in DOM and CSS rather than generated as images. Their
screens have to carry real readable text — six event names, eight roles, FAQ
links — which image generation cannot do reliably. It also makes the hotspot
*be* the element, so focus order, hit area and accessible name need no separate
bookkeeping, and all four rooms share one shell.

The city seen through each interior window is a real frame from the descent, so
the rooms sit in the same city the visitor just fell through.

Ambient loops (a failing sign, headlights crossing the junction, a drone) are
CSS keyframes, not video. They are interface effects dressed as scene content,
so a clip would cost bandwidth and sync trouble for something a keyframe does
deterministically and for free.

## Navigation

Three registers, matched to what the visitor is doing:

- **Crossroads** — the four signboards *are* the navigation. No chrome over them.
- **Interiors** — two fixed chips: back to the crossroads on the left, Register
  on the right (suppressed on the Register scene itself). Registration is the
  site's job, so it stays one click away from every room.
- **Conventional pages** — a real sticky header: wordmark, inline nav, Register.

The 404 stays in the world and names all four destinations, which is the one
useful thing a not-found page can do.

`/events?event=<id>` opens that event's screen on arrival, so a single event can
be shared. The open screen is mirrored back into the URL with `replace`, so
opening and closing screens does not fill the back button.

## Type

Chakra Petch (display) and Manrope (body) are **self-hosted** from `public/fonts`,
latin subsets only, 56 KB for all three files. Manrope ships as one variable file
covering 400-700 — Google serves the same variable woff2 for every weight, so
requesting four gets you the same file four times.

This is not only a performance choice. A font CDN is a render-blocking round trip
to a third party before the first heading can paint, and school and campus
networks are exactly the kind that filter it. There are no third-party requests
on any route; a test asserts it.

## Responsive behaviour

The hub is **one set of markup with two layouts**. Above `48rem` *and* wider
than `5/4`, the four signs are absolutely positioned onto the billboards inside
an aspect-locked 16:9 stage. Below that, the plate becomes a lit backdrop and
the same four elements stack as cards.

Same DOM either way. Rendering a second copy for mobile would double the
focusable elements and hand screen readers two copies of the site's main
navigation.

The scroll scrub is wide-viewport only. On a phone the film plays once and the
signs sit under it: scrubbing a video on iOS Safari fights the collapsing URL
bar and the decoder's seek throttling, and a 16:9 frame in a portrait viewport
is a band a couple of centimetres deep.

## Degradation

Three paths collapse the pinned descent into an ordinary page, all landing on
the same layout:

- `prefers-reduced-motion` — ambient loops off, phase-through becomes a fade.
- Narrow or portrait viewports.
- The film failing to decode — otherwise the visitor gets six screens of scroll
  against a frozen poster and a loading message that never clears.

With JavaScript off, the hub renders at full opacity and every sign is a real
`<a href>`.

Print styles drop the scenery, force every collapsed disclosure open, and
resolve link targets in the margin — people print the event list before the day.

## Verification

```bash
npm run build && npm run lint          # both clean
```

Checked with Playwright and axe-core against a running dev server:

- **0 axe violations** (WCAG 2.0 / 2.1 / 2.2, A and AA) on all ten routes.
- Every crossroads sign reaches its interior and back; each page's `h1` matches
  the sign that led to it.
- Registration reachable in one click from every interior and every page header.
- Event deep links open, mirror to the URL, and clear on close.
- The form's validation, focus-to-first-error, `aria-invalid` /
  `aria-describedby` wiring, and the pre-launch details check.
- Reduced motion: pin collapses, ambient stops, and the title does not land on
  the signs.
- Decode failure: detected, pin collapses, hub stays reachable, no stuck
  loading message.
- Self-hosted fonts load and no request leaves the origin.

One caveat worth knowing: the bundled Chromium used for these checks has **no
H.264 decoder**, so it always takes the decode-failure path. The scrub itself
was verified separately by temporarily swapping in a VP9 encode of the same
film.
