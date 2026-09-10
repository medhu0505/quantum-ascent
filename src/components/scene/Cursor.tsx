import { useEffect, useRef } from "react";

/**
 * Pointer.
 *
 * Two parts, and the gap between them is the whole effect: a dot that tracks
 * the pointer exactly, and a ring that chases it with easing. The lag is what
 * gives the pointer weight — the same reason the scroll is interpolated
 * rather than stepped.
 *
 * The ring also carries state. Over anything interactive it opens up and
 * takes the element's accent; over a sign it shows what the click will do.
 * That turns a decorative cursor into an affordance.
 *
 * Magnetism is handled here too rather than per-component: any element marked
 * `data-magnetic` is pulled a little toward the pointer while it is near, so
 * targets feel like they want to be hit. Both are pointer-only — a touch
 * device has no hover state to describe, and reduced motion switches the
 * whole thing off.
 */

/** How far a magnetic element reaches, and how hard it pulls. */
const MAGNET_RADIUS = 90;
const MAGNET_STRENGTH = 0.32;

export function Cursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    document.documentElement.dataset["cursor"] = "on";

    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    let rx = px;
    let ry = py;
    let raf = 0;
    let magnet: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;

      const el = e.target as HTMLElement | null;
      const hit = el?.closest<HTMLElement>(
        "a, button, [role='button'], input, select, textarea, summary",
      );

      ring.dataset["state"] = hit ? "active" : "idle";
      // The sign's own accent, so the pointer belongs to whatever it is over.
      const accented = hit?.closest<HTMLElement>("[data-accent]");
      ring.style.setProperty(
        "--cursor-accent",
        accented ? getComputedStyle(accented).getPropertyValue("--accent-hue") : "",
      );

      const hint = hit?.getAttribute("data-cursor-label") ?? "";
      label.textContent = hint;
      ring.dataset["labelled"] = hint ? "true" : "";

      magnet = el?.closest<HTMLElement>("[data-magnetic]") ?? null;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);

      // Ring eases toward the pointer; the dot is already exact.
      rx += (px - rx) * 0.18;
      ry += (py - ry) * 0.18;
      dot.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;

      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < MAGNET_RADIUS + Math.max(r.width, r.height) / 2) {
          magnet.style.setProperty("--magnet-x", `${dx * MAGNET_STRENGTH}px`);
          magnet.style.setProperty("--magnet-y", `${dy * MAGNET_STRENGTH}px`);
        } else {
          magnet.style.removeProperty("--magnet-x");
          magnet.style.removeProperty("--magnet-y");
        }
      }
    };

    const release = () => {
      magnet?.style.removeProperty("--magnet-x");
      magnet?.style.removeProperty("--magnet-y");
      magnet = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", () => (ring.dataset["press"] = "true"));
    window.addEventListener("pointerup", () => (ring.dataset["press"] = ""));
    document.addEventListener("pointerleave", release);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
      delete document.documentElement.dataset["cursor"];
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring">
        <span ref={labelRef} className="cursor-label" />
      </div>
    </div>
  );
}
