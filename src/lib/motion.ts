import { useSyncExternalStore } from "react";

/**
 * Subscribes to a media query without touching `window` during render, so it
 * is safe under SSR. The server snapshot is the conservative answer for each
 * caller; the client corrects it on hydration.
 */
function subscribeToQuery(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * True when the visitor has asked their OS to reduce motion.
 *
 * Purely visual suppression is handled in CSS so it applies before hydration.
 * This hook exists for the behavioural fork only: the scroll-scrubbed descent
 * is replaced by a still rather than merely slowed down.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToQuery(REDUCED_MOTION),
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * True when the viewport can host the 16:9 billboard stage. Mirrors the
 * breakpoint in styles.css; below it the hub renders as stacked cards.
 */
const STAGE_QUERY = "(min-width: 48rem) and (min-aspect-ratio: 5 / 4)";

export function useStageLayout(): boolean {
  return useSyncExternalStore(
    subscribeToQuery(STAGE_QUERY),
    () => window.matchMedia(STAGE_QUERY).matches,
    () => false,
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Maps `value` from [inMin, inMax] onto [0, 1], clamped. */
export function progress(value: number, inMin: number, inMax: number): number {
  if (inMax === inMin) return 0;
  return clamp((value - inMin) / (inMax - inMin), 0, 1);
}
