# Quantum V2.0

The event site for Quantum V2.0, the inter-school tech and culture fest at
Air Force Bal Bharati School, Lodhi Road, New Delhi.

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

Registrations are **live**. Firestore takes each entry and the organisers' sheet
receives a copy; rules are deployed and the whole path was verified end to end
against production on 22 Sep. Nothing in this table blocks a registration any
more — what is left is copy a visitor reads.

| Value | Where | What breaks until it is set |
| --- | --- | --- |
| `team` roster | `src/data/quantum.ts` | Eight names. Meet the Team currently shows eight real roles with every name badged as pending, which is the most visibly unfinished thing on the site. |
| `contact` | `src/data/quantum.ts` | Contact page and footer show badges instead of an email, phone and handle. |
| `FEST_DATES` | `src/data/quantum.ts` | Contact shows a badge under the venue address where the dates belong, and the JSON-LD omits `startDate`. |
| `BROCHURE_URL` | `src/data/quantum.ts` | About shows a badge instead of a download button. The button appears, pointing at this URL, as soon as it is a real one. |

Event copy, FAQ answers and the About editorial are final — no placeholders there.

Three things outside this file are also outstanding, and none of them are code:

- **Two test rows** sit in the Registrations tab of the organisers' sheet, filed
  under "Test Public School" and "Vercel Test School". Delete them before entries
  open. They are not only cosmetic: the Apps Script's duplicate check reads that
  tab, so a real entrant reusing one of those addresses for the same events would
  be told they are already registered.
- **App Check is not enabled**, deliberately. See the Firebase section. It is
  waiting on a settled domain, because a reCAPTCHA key is bound to specific hosts
  and binding one to the current `*.vercel.app` address means redoing it.
- **No custom domain.** The site answers on `quantum-ascent.vercel.app`. If a real
  one is coming, attach it before App Check rather than after.

One thing that is working as designed and reads like a fault: the sheet grows a
new tab per school as entries arrive, named after that school. The Registrations
tab stays the record of truth; the per-school tabs are copies. Do not tidy them
away.

The school's name is settled: **Air Force Bal Bharati School**, set once in
`school.name` and read from there everywhere.

## Registrations backend

Two backends, one contract. `src/lib/registrations.ts` picks between them and is
the only file that knows which is live; the form asks it `isRegistrationOpen()`
and gets back a reply with an ID in it or does not. Both answer in the same
shape, and a registration counts as received only when one of them returns an
ID. There is no fake success path anywhere in either.

**Firestore** takes the entry when the Firebase variables are set. **Apps
Script** takes it when they are not, and otherwise receives a copy so the
organisers' Google Sheet keeps filling — which is still where the day is
actually run from. A mirror that fails is logged and never fails a
registration Firestore already accepted.

### Firebase

Copy `.env.example` to `.env.local` and fill in the three required values from
the Firebase console (Project settings > Your apps > Web app). Set the same
values in the hosting environment for a deployment. None of them are secret: a
Firebase web config is published in every client bundle by design, and `apiKey`
identifies the project rather than authorising anything.

What does the authorising is `firestore.rules`, and they have to be deployed
before the form goes live:

```bash
npm run firebase:rules   # the project is named in .firebaserc
npm run test:rules      # the rules, against the emulator
```

The rules are the whole server-side check, because the form is public and
unauthenticated. They enforce three things rather than assume them:

- **Create only.** No read, no update, no delete, for any client. Entries carry
  students' names, phone numbers and emails. Organisers read the collection
  through the console or the Admin SDK, both of which bypass rules.
- **One entry per email per event set.** A document's id is SHA-256 of the
  lowercased lead email and the chosen events, and a create only succeeds on a
  document that does not exist. The rules recompute that hash, so a client
  cannot pick its own id and write the same entrant a thousand times.
- **Every field.** Type, class, email, phone, Discord handle, event list,
  length caps, and each of the five possible team members.

The visible `QV2-XXXXXXXX` ID is the first eight digits of that same hash, so a
resubmit is answered with the original ID having read nothing back.

Rules are capped at 1000 expression evaluations per request. The checks in
`firestore.rules` are inlined and repetitive for that reason — a factored
version of exactly the same checks exceeded the cap on a five-member team, and
failed only for the largest teams. `tests/firestore-rules.test.mjs` submits that
worst case deliberately.

**App Check** is the control the rules cannot be. Rules see the shape of a
write, never its sender, so nothing above stops a script filling the collection
with plausible teams. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` to a reCAPTCHA v3
key and enforce App Check on Firestore in the console. It is optional because a
half-configured App Check rejects real registrations.

The SDK is loaded on demand and only in the browser, from
`firebase/firestore/lite` — the site writes and never subscribes, so the
realtime client's transport and offline cache would be several hundred
kilobytes bought to do one POST. Nothing about Firebase is fetched on a route
that does not need it, including the analytics module, which stays unrequested
unless `VITE_FIREBASE_ANALYTICS` is exactly `"true"`. Leave it off and the
site's no-third-party-requests property still holds.

### Apps Script

Entries go to a Google Sheet, **Quantum V2.0 Registrations**, on the organiser's
Drive. A bound Apps Script (`backend/registrations.gs`) is deployed as a web app
and is the only thing that writes to it. The form POSTs JSON to
`REGISTRATION_ENDPOINT`, and the script checks every field again, rejects
anything else, and appends one row to the `Registrations` tab. It returns a
`QV2-XXXXXXXX` ID. If the same email registers again for the same event, the
script returns the original ID and adds no row. It also neutralises formula
injection and ignores anything that fills in the hidden `website` field.

Mirrored entries arrive carrying the ID Firestore already issued, and the script
takes it rather than minting a second one, so a registration does not end up with
two different IDs in two places. Anything that is not the exact `QV2-XXXXXXXX`
shape is discarded and an ID is minted as before.

To change the script, paste the new file into the sheet's Extensions > Apps Script
editor. Then use Deploy > Manage deployments > Edit > New version. That keeps the
same `/exec` URL. A *new* deployment gets a new URL, and `REGISTRATION_ENDPOINT`
would have to change with it.

**Deploying the current script is required** for the ID passthrough above.
Without it the sheet keeps working and simply mints its own IDs, which will not
match Firestore's.

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
npm run build          # clean
npm run typecheck      # clean
npm run test:rules     # 42 checks, against the Firestore emulator
npm run lint           # clean
```

`tests/firestore-rules.test.mjs` runs `firestore.rules` against the emulator: the
happy path, the closed collection, the duplicate limit and four ways to try to
sidestep it, and every field rejected on its own. `tests/registration-e2e.mjs`
drives the real form in a real browser against the emulator — the SDK staying off
every other route, a submit reaching Firestore, the receipt's ID matching the
stored document, the duplicate answering with the original ID, and the honeypot
writing nothing. It needs Playwright installed; the file's header has the commands.

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
