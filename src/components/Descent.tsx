import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Ambient } from "@/components/scene/Ambient";
import { HubPlate, HubSigns } from "@/components/Hub";
import { fest, school, descentFilm, timeline } from "@/data/quantum";
import { clamp, lerp, progress, usePrefersReducedMotion, useStageLayout } from "@/lib/motion";
import { useLenis } from "@/components/scene/SmoothScroll";

/**
 * The intro descent.
 *
 * On a wide viewport the film is scrubbed by scroll inside a pinned stage:
 * scrollY maps to currentTime across the whole 10.006s, the title burns off
 * during the aerial beat, and the crossroads signs light up as the camera
 * settles. The plate that fades in over the last stretch is the film's own
 * final frame, so the handoff into the hub is a cut between identical pixels.
 *
 * On a phone the pin and the scrub are both dropped. Scroll-scrubbing a video
 * on iOS Safari fights the collapsing URL bar and the decoder's seek
 * throttling, and a 16:9 frame in a portrait viewport is a band a couple of
 * centimetres deep. There the film simply plays once and the signs sit under
 * it as cards. Same markup, same routes, same labels.
 */

/** Total scroll the pinned descent consumes, in viewport heights. */
const SCROLL_VH = 620;

/**
 * Remembers, for this tab only, that the visitor has already made the descent.
 * Interiors are only reachable from the crossroads, so coming back should
 * return them to the crossroads — not to the top of a six-screen scroll they
 * have already sat through. Session-scoped on purpose: a fresh visit
 * tomorrow gets the film again.
 */
const ARRIVED_KEY = "quantum:arrived";

function markArrived() {
  try {
    sessionStorage.setItem(ARRIVED_KEY, "1");
  } catch {
    /* Private mode or blocked storage: the descent simply replays. */
  }
}

function hasArrived(): boolean {
  try {
    return sessionStorage.getItem(ARRIVED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Scroll progress at which the film finishes and the hub starts arriving. */
const SCRUB_END = 0.78;
/**
 * Scroll progress at which the hub is fully lit. The remaining travel is
 * deliberate slack: it keeps the lit hub pinned for the better part of a
 * screen instead of sliding away the moment it arrives.
 */
const REVEAL_END = 0.86;

export function Descent() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  const isStage = useStageLayout();
  const lenis = useLenis();

  const [revealed, setRevealed] = useState(false);

  // Published on <html> the moment the hub is actually on screen — whether
  // that is the end of a scrubbed scroll, a skip, or reduced motion handing
  // over the crossroads immediately — so CSS elsewhere on the page (the
  // floating footer pill) can key off it without this component needing to
  // know that pill exists. Same pattern the cursor and the no-JS flag use:
  // a root-level attribute for a piece of state a completely different part
  // of the tree needs to react to.
  useEffect(() => {
    if (revealed) document.documentElement.dataset["hub"] = "arrived";
    else delete document.documentElement.dataset["hub"];
    return () => {
      delete document.documentElement.dataset["hub"];
    };
  }, [revealed]);

  const [buffered, setBuffered] = useState(false);
  /**
   * The film failed to load, or the browser cannot decode it. Rare, but the
   * alternative is six screens of scroll against a frozen poster and a
   * loading message that never clears — so this collapses the pin and hands
   * over the crossroads, exactly as reduced motion does.
   */
  const [filmFailed, setFilmFailed] = useState(false);

  const scrubbing = isStage && !reducedMotion && !filmFailed;
  /** True once a non-scrubbed playthrough has finished, or will never start. */
  const [filmPlayed, setFilmPlayed] = useState(false);

  /**
   * What the crossroads plate is doing, which is entirely a function of what
   * the film is doing:
   *
   *   scrub — the loop fades it in as the camera settles.
   *   play  — the film runs once; the plate waits behind it and takes over at
   *           the end, so the signs land on a still rather than a paused video.
   *   still — no film, so the plate is the scene from the start.
   *
   * Getting this wrong is not subtle: an opaque plate over a playing film
   * hides the film completely, which is what it did on every narrow viewport.
   */
  const plateMode: "scrub" | "play" | "still" = scrubbing
    ? "scrub"
    : reducedMotion || filmFailed || filmPlayed
      ? "still"
      : "play";

  /* ---- Returning to the crossroads --------------------------------- *
   * Runs before paint so the visitor never sees the top of the descent
   * flash past on the way to where they actually left off.
   */
  const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIsomorphicLayoutEffect(() => {
    if (!scrubbing || !hasArrived()) return;

    let frame = 0;
    let tries = 0;

    // Two things fight this jump. The document is still the previous route's
    // height for a frame or two, so an early scrollTo silently clamps to
    // nothing; and the router restores scroll after the route commits, which
    // would drop the visitor back at the top. So keep re-asserting until the
    // scroll actually lands, then stop.
    const jump = () => {
      const section = sectionRef.current;
      if (!section) return;

      const target = section.offsetTop + section.offsetHeight - window.innerHeight;
      if (target <= 0) return;

      if (Math.abs(window.scrollY - target) > 2) {
        if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
        else window.scrollTo({ top: target, behavior: "auto" });
      }

      // Landed, or out of patience (~30 frames is half a second).
      if (Math.abs(window.scrollY - target) <= 2 || ++tries > 30) return;
      frame = requestAnimationFrame(jump);
    };

    jump();
    return () => cancelAnimationFrame(frame);
  }, [scrubbing, lenis]);

  /* ---- Scroll scrub ------------------------------------------------ */
  useEffect(() => {
    if (!scrubbing) {
      setRevealed(true);
      // The loop writes opacity and transform straight onto these nodes. If it
      // ran before the descent collapsed — the layout changed, or the film
      // failed to decode after hydration — those inline values survive and
      // leave the plate at opacity 0 and the title mid-fade. Hand them back.
      if (plateRef.current) plateRef.current.style.opacity = "";
      if (titleRef.current) {
        titleRef.current.style.opacity = "";
        titleRef.current.style.transform = "";
      }
      stageRef.current?.style.removeProperty("--reveal");
      return;
    }
    setRevealed(false);

    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let raf = 0;
    let smoothed = 0;
    // iOS Safari drops seeks issued while an earlier one is still resolving,
    // which leaves currentTime stuck. Only ever have one in flight.
    let seeking = false;
    const onSeeked = () => {
      seeking = false;
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onSeeked);

    let lastRevealed: boolean | null = null;
    let lastReveal = -1;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const rect = section.getBoundingClientRect();
      const travel = section.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / Math.max(1, travel), 0, 1);

      const duration =
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : timeline.duration;

      // Ease the seek target so a flung wheel does not ask the decoder for a
      // dozen distant frames in as many milliseconds.
      const target = progress(p, 0, SCRUB_END) * duration;
      smoothed = lerp(smoothed, target, 0.2);
      if (Math.abs(smoothed - target) < 0.005) smoothed = target;

      if (!seeking && Math.abs(video.currentTime - smoothed) > 1 / 48) {
        seeking = true;
        try {
          video.currentTime = smoothed;
        } catch {
          seeking = false;
        }
      }

      // Title burns off across the aerial beat.
      if (titleRef.current) {
        const out = progress(smoothed, timeline.aerial[0], timeline.aerial[1] * 0.8);
        titleRef.current.style.opacity = String(1 - out);
        titleRef.current.style.transform = `translate3d(0, ${out * -44}px, 0)`;
      }

      // Crossfade the held final frame in over the film. Both are the same
      // pixels by this point, so the swap itself is invisible; it exists so
      // the hub is sitting on an image rather than on a paused video.
      const reveal = progress(p, SCRUB_END, REVEAL_END);
      if (reveal !== lastReveal) {
        lastReveal = reveal;
        if (plateRef.current) plateRef.current.style.opacity = String(reveal);
        stageRef.current?.style.setProperty("--reveal", String(reveal));
      }

      const isRevealed = reveal > 0.55;
      if (isRevealed !== lastRevealed) {
        lastRevealed = isRevealed;
        setRevealed(isRevealed);
        if (isRevealed) markArrived();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onSeeked);
    };
  }, [scrubbing]);

  /* ---- iOS decoder unlock ------------------------------------------ *
   * Mobile Safari will not decode frames for a video that has never been
   * handed a user gesture, so seeking silently does nothing and the hero
   * stays frozen on the poster. One muted play/pause on the first gesture
   * clears it. Harmless everywhere else.
   */
  useEffect(() => {
    if (!scrubbing) return;
    const video = videoRef.current;
    if (!video) return;

    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      void video
        .play()
        .then(() => video.pause())
        .catch(() => {
          /* Autoplay refused; scrubbing still works on desktop. */
        });
      remove();
    };
    const remove = () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("touchstart", unlock, { passive: true, once: true });
    window.addEventListener("pointerdown", unlock, { passive: true, once: true });
    window.addEventListener("wheel", unlock, { passive: true, once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return remove;
  }, [scrubbing]);

  /* ---- Decode failure ----------------------------------------------- *
   * Only two things count as failure: the element firing `error`, or the
   * element still having nothing at all well after mount.
   *
   * Reading networkState synchronously here does not work. On a client-side
   * remount — coming back to the crossroads from an interior — the effect can
   * run before React has committed `src` and resource selection has begun, so
   * networkState is momentarily NETWORK_NO_SOURCE on a video that is about to
   * load perfectly well. That false positive collapsed the whole pinned
   * descent to a short page and never reset, which is what made the city
   * unscrollable after a round trip.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fail = () => setFilmFailed(true);
    const recovered = () => setFilmFailed(false);

    // The element can fail before this effect ever runs — a browser with no
    // decoder for the file rejects it the moment the source is set, which on a
    // fast connection is well before hydration. That `error` event is gone by
    // the time the listener below is attached, leaving only the grace timer to
    // notice, six seconds later, with the loading message on screen the whole
    // time. `error` is safe to read synchronously in a way `networkState` is
    // not: it is terminal, and it is only ever set by a real media failure,
    // never by a remount that has yet to commit `src`.
    if (video.error) fail();

    video.addEventListener("error", fail);
    video.addEventListener("loadeddata", recovered);

    // A source that never resolves fires no event, so confirm on a delay —
    // by which point a healthy element has long since started loading.
    const grace = window.setTimeout(() => {
      if (
        video.readyState === HTMLMediaElement.HAVE_NOTHING &&
        video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
      ) {
        fail();
      }
    }, 6000);

    return () => {
      window.clearTimeout(grace);
      video.removeEventListener("error", fail);
      video.removeEventListener("loadeddata", recovered);
    };
  }, []);

  /* ---- Buffer gate -------------------------------------------------- *
   * The file is re-encoded with a keyframe every four frames so seeks land
   * without decoding from the start, but a seek still needs its bytes. Watch
   * `buffered` rather than readyState: readyState 4 says "can play through",
   * not "the whole range is local", and scrubbing jumps around the range.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const check = () => {
      const d = video.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= 0.1 && video.buffered.end(i) >= d - 0.3) {
          setBuffered(true);
          return;
        }
      }
    };
    check();
    video.addEventListener("progress", check);
    video.addEventListener("loadedmetadata", check);
    video.addEventListener("canplaythrough", check);
    return () => {
      video.removeEventListener("progress", check);
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("canplaythrough", check);
    };
  }, []);

  /* ---- Narrow layout: play the film once, do not scrub -------------- */
  useEffect(() => {
    if (scrubbing || reducedMotion) return;
    const video = videoRef.current;
    if (!video) return;

    // Hand the scene to the plate when the film finishes — or if it fails, so
    // a refused playthrough never leaves the hub without a backdrop.
    const done = () => setFilmPlayed(true);
    video.addEventListener("ended", done);
    video.addEventListener("error", done);

    // Respect Data Saver and slow radios: the poster alone tells the story.
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (conn?.saveData || /^(slow-)?2g$/.test(conn?.effectiveType ?? "")) {
      // No film on a metered or slow connection: show the crossroads instead
      // of holding a poster the visitor is paying for twice.
      setFilmPlayed(true);
      return () => {
        video.removeEventListener("ended", done);
        video.removeEventListener("error", done);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void video.play().catch(() => {
              /* Autoplay refused; the poster stands in. */
            });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.removeEventListener("ended", done);
      video.removeEventListener("error", done);
    };
  }, [scrubbing, reducedMotion]);

  const skipToHub = () => {
    const section = sectionRef.current;
    if (!section) return;
    markArrived();
    const top = section.offsetTop + section.offsetHeight - window.innerHeight;
    if (lenis) {
      // Ride the descent down rather than teleporting: the film scrubs the
      // whole way, which is the point of offering the skip at all.
      lenis.scrollTo(top, { duration: reducedMotion ? 0 : 2.2 });
    } else {
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="descent"
      data-film={filmFailed ? "failed" : undefined}
      aria-label="Descent into Quantum V2.0"
    >
      <div className="descent-pin">
        <div className="hub">
          {/* Outside the stage on purpose: when the descent collapses, the
              title leads the page instead of landing on the billboards. */}
          <div ref={titleRef} className="descent-title">
            <h1>
              <span className="descent-title-word">{fest.name}</span>
              <span className="descent-title-word text-gradient-neon">{fest.edition}</span>
            </h1>
            <p className="descent-title-school">{school.name}</p>
          </div>

          <div className="hub-stage" ref={stageRef}>
            <video
              ref={videoRef}
              className="hub-plate descent-film"
              src={descentFilm.src}
              poster={descentFilm.poster}
              width={descentFilm.width}
              height={descentFilm.height}
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* The film's final frame, faded in as the camera settles. */}
            <div ref={plateRef} className="descent-plate" data-plate={plateMode}>
              <HubPlate />
            </div>

            <div className="hub-scrim" />
            <Ambient />

            <HubSigns inert={scrubbing && !revealed} />

            {scrubbing && !revealed ? (
              <div className="descent-controls">
                <p className="descent-hint descent-chip">
                  <span className="eyebrow">Scroll to descend</span>
                  <span className="scroll-hint" aria-hidden="true">
                    ↓
                  </span>
                </p>
                <button type="button" className="descent-skip" onClick={skipToHub}>
                  Skip the descent
                </button>
                {!buffered && !filmFailed ? (
                  <p className="descent-loading" role="status">
                    Loading the descent…
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
