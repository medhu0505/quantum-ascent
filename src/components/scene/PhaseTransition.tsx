import { useRouter } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { crossroadsPlate } from "@/data/quantum";

/**
 * The phase-through.
 *
 * Clicking a signboard freezes the outgoing plate over the whole viewport and
 * flies it toward the sign that was clicked while it blurs out, so the cut
 * reads as passing through the billboard rather than as a page swap. The new
 * route renders underneath and the veil uncovers it.
 *
 * It is a single fixed <img> and two CSS keyframes: no per-transition video,
 * no second copy of the scene, nothing to keep in sync. Reduced motion turns
 * the whole thing into a 180ms fade (see styles.css).
 */

type Phase = { x: number; y: number; key: number; dir: "in" | "out" } | null;

type PhaseContextValue = {
  /** Navigate to `to`, flying the plate toward the element that was clicked. */
  phaseTo: (to: string, origin: HTMLElement | null) => void;
};

const PhaseContext = createContext<PhaseContextValue | null>(null);

/** Matches --dur-scene in styles.css. */
const PHASE_MS = 340;

export function PhaseProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(null);

  const phaseTo = useCallback(
    (to: string, origin: HTMLElement | null) => {
      /*
       * Which way through the billboard.
       *
       * Going into a room, the plate rushes past the camera: it is the
       * crossroads you are leaving, and it blows out as you pass through the
       * sign. Coming back, the same animation played the same way round said
       * you were passing through a second billboard into somewhere new,
       * when what actually happens is that you step back out and the
       * crossroads settles in front of you. Same move, run backwards.
       */
      const dir = to === "/" ? "out" : "in";

      /*
       * Centre of the clicked sign, as a percentage of the viewport, so the
       * plate flies toward the board the visitor actually chose rather than
       * always toward the middle. Only on the way in: on the way out the
       * thing clicked is the exit chip in the top-left corner, and scaling
       * down about that point reads as the crossroads receding into a
       * corner. Pulling back to the whole frame is a centre move.
       */
      let x = 50;
      let y = 50;
      if (origin && dir === "in") {
        const r = origin.getBoundingClientRect();
        x = ((r.left + r.width / 2) / window.innerWidth) * 100;
        y = ((r.top + r.height / 2) / window.innerHeight) * 100;
      }
      const cover = () => {
        setPhase({ x, y, key: Date.now(), dir });
        // Two frames, so the veil has actually painted before the outgoing
        // route is torn down. Navigating in the same tick left a gap where
        // the crossroads had gone and the next page had not arrived yet —
        // a blank screen in the middle of the transition.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => void router.navigate({ to }));
        });
      };

      cover();
    },
    [router],
  );

  useEffect(() => {
    if (!phase) return;
    const id = window.setTimeout(() => setPhase(null), PHASE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const value = useMemo(() => ({ phaseTo }), [phaseTo]);

  return (
    <PhaseContext.Provider value={value}>
      {children}
      {phase ? (
        <div
          key={phase.key}
          className="phase-veil"
          data-dir={phase.dir}
          aria-hidden="true"
          style={
            {
              "--phase-x": `${phase.x}%`,
              "--phase-y": `${phase.y}%`,
            } as React.CSSProperties
          }
        >
          <img src={crossroadsPlate.webp} alt="" decoding="sync" />
        </div>
      ) : null}
    </PhaseContext.Provider>
  );
}

/**
 * Returns a click handler for a scene link. Falls back to ordinary navigation
 * when the provider is absent, and always leaves modified clicks
 * (new tab, new window, download) to the browser.
 */
export function usePhaseLink(to: string) {
  const ctx = useContext(PhaseContext);

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
      ctx.phaseTo(to, event.currentTarget);
    },
    [ctx, to],
  );
}
