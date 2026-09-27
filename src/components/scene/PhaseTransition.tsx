import { useRouter } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

/**
 * The phase-through.
 *
 * Clicking a signboard flies the crossroads toward the board that was clicked
 * while it blurs out, and the room comes up through the blur, so the cut
 * reads as passing through the billboard rather than as a page swap. Coming
 * back runs it the other way: the crossroads settles out of the blur onto
 * its own pixels.
 *
 * It runs as a view transition. The browser takes a picture of the page as
 * it stands at the click, billboard labels, pill and the glow on the chosen
 * board included, plays the zoom on that picture, and brings the next page
 * up only once that page has really rendered. The version before flew a
 * separate photograph of the empty plate instead, and every seam came from
 * that photograph: it was decoded on the click, which put black frames on
 * screen; the labels vanished the instant it covered them; the zoom stalled
 * while the next page rendered; and it ran on a fixed timer, so a slow page
 * arrived after it had lifted.
 *
 * A browser without view transitions navigates plainly and the room's own
 * entrance plays. Reduced motion gets a short crossfade.
 */

/**
 * How to get there. A sign on the crossroads flies you through the board; a
 * screen change in the phone app fades the page out to the street at night
 * and lifts the next one in over it.
 */
export type PhaseMode = "sign" | "screen";

export type PhaseOptions = {
  mode?: PhaseMode;
  /** Search params for the destination, such as the event to open. */
  search?: Record<string, string>;
};

type PhaseContextValue = {
  /** Navigate to `to`, flying the page toward the element that was clicked. */
  phaseTo: (to: string, origin: HTMLElement | null, options?: PhaseOptions) => void;
};

const PhaseContext = createContext<PhaseContextValue | null>(null);

/**
 * The longest the picture of the old page is held while the next one
 * renders. Past this the flourish is not worth a frozen screen, so the page
 * goes through without it.
 */
const HOLD_MS = 3000;

/** Only the latest transition may tidy up after itself. */
let latest = 0;

export function PhaseProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const phaseTo = useCallback(
    (to: string, origin: HTMLElement | null, options: PhaseOptions = {}) => {
      const target = options.search ? { to, search: options.search } : { to };
      if (typeof document.startViewTransition !== "function") {
        void router.navigate(target);
        return;
      }

      /*
       * Which way through the billboard.
       *
       * Going into a room, the crossroads rushes past the camera: it is the
       * place you are leaving, and it blows out as you pass through the
       * sign. Coming back, the same move played the same way round said you
       * were passing through a second billboard into somewhere new, when
       * what actually happens is that you step back out and the crossroads
       * settles in front of you. Same move, run backwards.
       */
      const dir = to === "/" ? "out" : "in";
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /*
       * Centre of the clicked sign, as a percentage of the viewport, so the
       * page flies toward the board the visitor actually chose rather than
       * always toward the middle. Only on the way in: on the way out the
       * thing clicked is the exit chip in the top-left corner, and scaling
       * about that point reads as the crossroads receding into a corner.
       * Pulling back to the whole frame is a centre move.
       */
      let x = 50;
      let y = 50;
      if (origin && dir === "in") {
        const r = origin.getBoundingClientRect();
        x = ((r.left + r.width / 2) / window.innerWidth) * 100;
        y = ((r.top + r.height / 2) / window.innerHeight) * 100;
      }

      const root = document.documentElement;
      root.style.setProperty("--phase-x", `${x}%`);
      root.style.setProperty("--phase-y", `${y}%`);
      root.dataset["phase"] = still ? "fade" : options.mode === "screen" ? "screen" : dir;
      const id = ++latest;

      /*
       * The next page is ready to be pictured once the router reports it
       * rendered. That is also when the router resets the scroll and when the
       * crossroads puts itself back at the hub; the earlier "resolved" event
       * comes before both, and would picture the new page at the old page's
       * scroll position.
       */
      const rendered = new Promise<void>((resolve) => {
        const done = () => {
          off();
          window.clearTimeout(timer);
          resolve();
        };
        const off = router.subscribe("onRendered", done);
        const timer = window.setTimeout(done, HOLD_MS);
      });

      const transition = document.startViewTransition(async () => {
        router.navigate(target).catch(() => {
          /* The router renders its own error page. */
        });
        await rendered;
      });

      // A transition can be skipped (another click, a hidden tab). That is
      // not an error worth reporting; the navigation happens regardless.
      transition.ready.catch(() => {});
      transition.finished
        .catch(() => {})
        .finally(() => {
          if (id !== latest) return;
          delete root.dataset["phase"];
          root.style.removeProperty("--phase-x");
          root.style.removeProperty("--phase-y");
        });
    },
    [router],
  );

  const value = useMemo(() => ({ phaseTo }), [phaseTo]);

  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
}

/**
 * Returns a click handler for a scene link. Falls back to ordinary navigation
 * when the provider is absent, and always leaves modified clicks
 * (new tab, new window, download) to the browser.
 */
export function usePhaseLink(to: string, options?: PhaseOptions) {
  const ctx = useContext(PhaseContext);
  // Read at click time rather than listed as a dependency: callers build the
  // options inline, and a handler rebuilt on every render for that would be
  // churn with no change in behaviour.
  const latestOptions = useRef(options);
  latestOptions.current = options;

  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!ctx) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      ctx.phaseTo(to, event.currentTarget, latestOptions.current);
    },
    [ctx, to],
  );
}
