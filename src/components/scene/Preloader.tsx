import { useEffect, useRef, useState } from "react";
import { descentFilm, fest, school } from "@/data/quantum";

/**
 * Opening title.
 *
 * The hero is a 2.7MB film that is scrubbed by scroll, so the worst possible
 * first second is a poster sitting still while the bytes arrive — the visitor
 * scrolls, nothing moves, and the site feels broken before it has started.
 *
 * This holds the door for that moment and makes it part of the piece: the
 * wordmark, a real progress figure, and a curtain that lifts once the film can
 * actually be scrubbed. Progress is genuine — it reads the video element's
 * buffered ranges — with a ceiling so it never sits at 100% waiting, and a
 * hard timeout so a stalled network can never trap anyone behind it.
 */
export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }

    let raf = 0;
    const MIN_MS = 900; // Long enough to read; short enough not to be a toll.
    const MAX_MS = 6000; // Never hold the site hostage to a slow network.

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const elapsed = Date.now() - startedAt.current;
      const video = document.querySelector("video");

      let ratio = 0;
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        for (let i = 0; i < video.buffered.length; i++) {
          ratio = Math.max(ratio, video.buffered.end(i) / video.duration);
        }
      }

      // Time floor keeps the counter moving even before the video reports
      // anything, so the number never looks frozen.
      const shown = Math.min(1, Math.max(ratio, elapsed / MAX_MS));
      setProgress(shown);

      if ((shown >= 0.99 && elapsed > MIN_MS) || elapsed > MAX_MS) {
        cancelAnimationFrame(raf);
        setDone(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="preloader" data-done={done || undefined} aria-hidden={done || undefined}>
      <div className="preloader-inner">
        <p className="preloader-mark">
          {fest.name} <span className="text-gradient-neon">{fest.edition}</span>
        </p>
        <p className="preloader-school">{school.name}</p>
        <p className="preloader-count" role="status" aria-live="polite">
          <span className="sr-only">Loading the descent, </span>
          {Math.round(progress * 100)}
          <span aria-hidden="true">%</span>
        </p>
        <span className="preloader-track" aria-hidden="true">
          <span className="preloader-bar" style={{ transform: `scaleX(${progress})` }} />
        </span>
      </div>
      <img className="preloader-poster" src={descentFilm.poster} alt="" aria-hidden="true" />
    </div>
  );
}
