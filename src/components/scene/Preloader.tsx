import { useEffect, useState } from "react";
import { descentFilm, fest, school } from "@/data/quantum";

/**
 * Opening title.
 *
 * The hero is an 8.7MB film that is scrubbed by scroll, so the worst possible
 * first second is a poster sitting still while the bytes arrive — the visitor
 * scrolls, nothing moves, and the site feels broken before it has started.
 *
 * This holds the door for that moment and makes it part of the piece: the
 * wordmark, a real progress figure, and a curtain that lifts once the film can
 * actually be scrubbed. Progress is genuine — it reads the video element's
 * buffered ranges — with a ceiling so it never sits at 100% waiting, and a
 * hard timeout so a stalled network can never trap anyone behind it.
 *
 * That timeout used to live inside a requestAnimationFrame loop, which meant
 * it was not a timeout at all. A browser does not service rAF in a hidden
 * tab, so opening the site in a background tab — a cmd-click, a restored
 * session, a link followed from another app — stopped the loop, and the
 * escape hatch stopped with it. Measured: with rAF suspended the counter sat
 * at 0% past ten seconds, done never flipped, and elementFromPoint at the
 * middle of the viewport returned the curtain. The whole site was behind it.
 *
 * So the hard stop is its own setTimeout now, outside the loop that reports
 * progress. Timers are throttled in a background tab; they are not suspended.
 * And the loop itself is an interval rather than rAF, for the same reason —
 * there is nothing here worth a frame callback, only a number and a 1px bar.
 *
 * The curtain also lifts without any of this: see the failsafe animation in
 * styles.css, which covers the case where the script never arrives at all.
 */
export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }

    const MIN_MS = 900; // Long enough to read; short enough not to be a toll.
    const MAX_MS = 6000; // Never hold the site hostage to a slow network.

    let interval = 0;
    let timeout = 0;
    let stopped = false;

    const finish = () => {
      stopped = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      // The counter lands on 100 rather than wherever the last tick left it.
      // When the hard stop is what ends this — a slow network, a film that
      // never buffered — that was 99%, and a progress bar that never reaches
      // the end reads as a thing that gave up rather than a thing that
      // finished.
      setProgress(1);
      setDone(true);
    };

    const tick = () => {
      if (stopped) return;

      // Counted from navigation, not from whenever this effect got to run.
      // The bundle has to arrive before any of this executes, and on a slow
      // connection that is already several seconds the visitor has spent
      // looking at the curtain. Starting the clock here would hand them a
      // fresh six on top of it.
      const elapsed = performance.now();
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

      if (shown >= 0.99 && elapsed > MIN_MS) finish();
    };

    // Started before the first tick, so a tick that finishes immediately —
    // a bundle that arrived after MAX_MS had already passed — has something
    // to clear rather than leaving an interval running behind it.
    interval = window.setInterval(tick, 90);
    timeout = window.setTimeout(finish, Math.max(0, MAX_MS - performance.now()));
    tick();

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
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
        {/* Shown on a phone only — see styles.css. The descent is a film
            scrubbed by a 620vh scroll and the crossroads is a 1920-wide
            plate; a phone gets a real version of both, but not the one this
            was drawn for. */}
        <p className="preloader-note">For the best experience, visit on a laptop.</p>
      </div>
      <img className="preloader-poster" src={descentFilm.poster} alt="" aria-hidden="true" />
    </div>
  );
}
