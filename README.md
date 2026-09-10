# Quantum Ascent

PROJECT: Quantum V2.0 — inter-school tech & culture fest, Air Force Bal Bharati School. TARGET QUALITY BAR: premium, $10k-agency-tier website. Every section should feel intentional and finished, not templated.

VIDEO ASSET: A finished 30-second cinematic descent video is attached — do NOT generate a replacement, do NOT use /video-creator or any video-generation tool. This file is the hero background and must be used as-is.

Video content map (use these timestamps for hotspot/section alignment):

- 0:00–0:06 — Wide aerial: moon centered, vertical light beam, city skyline below.

- 0:06–0:16 — Descending through a canyon of skyscrapers; building facades carry blank glowing ad-panel shapes (pink/cyan/violet) — this is where the six event holograms attach.

- 0:16–0:24 — Nearing street level; wet reflective asphalt fills lower frame.

- 0:24–0:30 — Street level reached; an open grate/sewer entrance appears ahead with flickering light from below — this is where the "Meet the Team" segment attaches.

Model for supporting imagery only:

- Image generation: GPT-Image-2, for any static assets NOT already covered by the video (hologram graphic overlays, UI icons, backgrounds outside the hero). Do not use it to regenerate or alter the hero video itself.

Core Creative Direction (must follow exactly):

LANDING / HERO

- The attached video IS the hero. On page load, it should appear paused/held at its first frame (0:00 — moon + beam + skyline), functioning as a still cinematic title card until the user scrolls.

- Text overlay (DOM, not baked into video): stacked, bold display "QUANTUM" / "V2.0", positioned near the beam/moon area of the frame. Subtext below, smaller weight: "F.S. Bal Bharati School".

- No clutter — this is a title card, not a busy hero.

SCROLL-TRIGGERED PLAYBACK

- Bind scroll position to video playback time: as the user scrolls down, map scrollY (within the hero's scroll range) linearly to video.currentTime across the full 0–30s duration.

- Playback must be entirely scroll-driven — the video does not autoplay or play independently of scroll input. Scrolling up should scrub the video backward.

- Use requestAnimationFrame or a scroll-linked technique (e.g. IntersectionObserver + rAF, or a library like GSAP ScrollTrigger if already available in the stack) for smooth, jank-free scrubbing — avoid naive scroll-event-only implementations that stutter.

- Pin/pin-spacer the video element for the duration of its scroll-driven section so the video stays fixed in viewport while scroll progress advances playback, then release pin and continue normal document flow once 30s of mapped scroll distance is consumed.

INTERACTIVE HOLOGRAMS ON BUILDINGS (0:06–0:16 window)

- During this window, overlay six interactive hotspots positioned over the blank ad-panel shapes visible in the video frame at their respective timestamps within this range.

- Hotspots are DOM/CSS elements (not baked into video) so they can be positioned, styled, and made accessible independently of the video pixels. Position them with coordinates keyed to the video's timestamp/frame, adjusting for the fact that panel positions may shift slightly as the camera moves — use a small number of keyframed position states interpolated across the window, not a single static coordinate.

- Hover: scale up. Click: navigate per routing config below.

Events (six total, one hologram per event):

- Quiz — solo or team of 2

- Film Making — team of 3–5

- Ad Shoot — team of 2–4

- Surprise — mystery challenge, revealed day-of

- Online Gaming — solo or squad

- Pitch — team of 2–3

- Build routing as per-event config: { mode: "brochure" | "internal-page", target: url | slug }. Default all six events to brochure mode until a brochure URL and/or internal-page decision is supplied per event. Use a TODO placeholder URL for the brochure target, clearly marked as such in code/config, not as user-facing dead text.

MEET THE TEAM (0:24–0:30 window)

- As the descent reaches the sewer/grate opening in this window, transition into the "Meet the Team" content — either as an overlay revealed during this window, or as the section immediately following once scroll-driven playback completes and normal scroll resumes. Choose whichever integrates more smoothly with the pinned-video mechanic and justify the choice.

- Team roster is not yet finalized — use clearly marked TODO placeholder entries (name/role) in a single data source (not scattered inline), so real names can be swapped in later without touching layout code.

CONTACT US

- Located in the footer, after the video-driven section has fully released. Plain and clean — no cyberpunk theatrics. This is the "landing back on solid ground" moment after the descent.

- Contact details (email/phone) are not yet finalized — use a clearly marked TODO placeholder value, not a fabricated-looking real address.

Technical requirements

- Scroll-scrubbed video is the primary hero mechanism. Provide a static-image fallback (use the video's first frame as a still) for `prefers-reduced-motion` and for devices/browsers that handle scroll-scrubbed video poorly.

- iOS Safari: `playsinline`, muted, explicit `.currentTime` seeking (iOS restricts autoplay and some scrubbing behavior — test and handle gracefully, e.g. by using a `requestVideoFrameCallback` or seeked-event pattern if direct scrubbing is unreliable).

- Preload the video appropriately (`preload="auto"` or a custom loading gate) so scrubbing doesn't stutter on first scroll due to buffering — show a loading state if the video isn't ready when the user starts scrolling.

- Placeholder content is permitted ONLY for: team roster, contact info, and brochure URL — each must be clearly marked as TODO in codebase/config, not rendered as convincing-looking fake data. Everywhere else (event names, descriptions, FAQ, page copy) requires real, finished content — no Lorem ipsum, no generic filler.

- FAQ content, event data, and team roster must have a single source of truth — no content duplication across files.

- Do not use Three.js, react-three-fiber, or any WebGL 3D engine anywhere on this site.

- Footer, forms, and non-hero pages (registration, event detail pages) may be conventional lightweight builds. The cinematic/video treatment is scoped to the hero descent + hologram layer only.

Pre-build validation

- Before building, confirm the attached video file loads correctly and report its actual duration/resolution/file size back — flag if it doesn't match the expected ~30s, since hotspot timestamp windows above assume that duration.

- Confirm scroll-scrubbed `<video>` playback bound to scroll position is feasible at production quality on this stack, and state your chosen implementation approach (rAF-driven, ScrollTrigger, or other) before proceeding.

- If any limitation is encountered (iOS scrubbing reliability, file size/load performance, etc.), flag it plainly and propose the best-practice alternative before proceeding.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2c5eb049-1b95-4cd2-a06e-a3d922fb13c6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
