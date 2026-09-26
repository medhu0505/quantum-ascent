import { useEffect, useRef } from "react";

/**
 * Pointer.
 *
 * Two parts, and the gap between them is the whole effect: a dot that tracks
 * the pointer exactly, and a ring that chases it with easing. The lag is what
 * gives the pointer weight.
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
    // What the ring last described. Undefined until the first move, so that
    // move always paints the ring's state.
    let described: HTMLElement | null | undefined;

    const release = () => {
      magnet?.style.removeProperty("--magnet-x");
      magnet?.style.removeProperty("--magnet-y");
      magnet = null;
    };

    /*
     * Runs while the ring is still chasing the pointer, then stops. It used
     * to run every frame for the life of the page, writing two transforms
     * into a document nobody was touching.
     */
    const frame = () => {
      raf = 0;

      // Ring eases toward the pointer; the dot is already exact.
      rx += (px - rx) * 0.18;
      ry += (py - ry) * 0.18;
      if (Math.abs(px - rx) < 0.1 && Math.abs(py - ry) < 0.1) {
        rx = px;
        ry = py;
      }
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
          release();
        }
      }

      if (rx !== px || ry !== py) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      wake();

      const el = e.target as HTMLElement | null;

      // Leaving one magnetic element for another, or for nothing, lets the
      // first one go. It used to keep its last pull and sit there displaced.
      const next = el?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (next !== magnet) {
        release();
        magnet = next;
      }

      // The ring's state only changes when the pointer crosses onto something
      // new, so it is only rewritten then. Doing it on every move read the
      // accent back through getComputedStyle each time.
      const hit =
        el?.closest<HTMLElement>("a, button, [role='button'], input, select, textarea, summary") ??
        null;
      if (hit === described) return;
      described = hit;

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
    };

    // Scrolling moves the page under a still pointer: a magnetic element that
    // slides out of reach has to let go even though the pointer never moved.
    const onScroll = () => {
      if (magnet) wake();
    };

    const onDown = () => (ring.dataset["press"] = "true");
    const onUp = () => (ring.dataset["press"] = "");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerleave", release);
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
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
