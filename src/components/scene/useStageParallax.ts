import { useEffect, type RefObject } from "react";

/**
 * Pointer parallax over the crossroads.
 *
 * The plate is a flat photograph, so the scene has no real depth — which is
 * the main reason a still frame with elements on top reads as a collage. This
 * gives it depth without any 3D: the layers that sit at different distances in
 * the fiction are offset by different amounts as the pointer moves, and the
 * brain reads the differential as parallax.
 *
 * Depth order, and therefore travel, runs: plate (furthest, barely moves) →
 * crowd → ambient fixtures → signage (nearest, moves most). The plate is also
 * scaled slightly so its edges can never be pulled into frame.
 *
 * Values are written once per frame as custom properties and consumed in CSS,
 * so no React state changes and nothing re-renders. Off for coarse pointers,
 * which have no hover to track, and off under reduced motion.
 */
export function useStageParallax(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // Normalised to -1..1 from the centre of the stage.
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      // Easing here rather than in CSS: a transition would fight the
      // per-frame writes and produce a rubber-banding lag.
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      el.style.removeProperty("--px");
      el.style.removeProperty("--py");
    };
  }, [ref]);
}
