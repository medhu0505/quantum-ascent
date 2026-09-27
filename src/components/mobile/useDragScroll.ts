import { useEffect, type RefObject } from "react";

/**
 * Drag a horizontal rail with a mouse or a pen the way a finger already can.
 *
 * Touch scrolling is left to the browser, which already does it well, snap
 * points and momentum included. A mouse has only the scrollbar, which the
 * rail hides, and a trackpad's sideways swipe, which most people never try.
 * So a press on the rail grabs it: it follows the pointer 1:1, a fling
 * carries on in the direction it was thrown, and it comes to rest on a card.
 * A press that barely moves is still a click on whatever is under it.
 */

/** Travel below which a press is a click, not a drag. */
const SLOP_PX = 6;
/** How far a fling carries past the release, per px/ms of speed. */
const THROW_MS = 220;

export function useDragScroll(
  ref: RefObject<HTMLElement | null>,
  /** Called with the card the rail settles on after a drag. */
  onSettle?: (index: number) => void,
) {
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;

    let id: number | null = null;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let samples: { x: number; t: number }[] = [];
    let settle = 0;

    const release = () => {
      window.clearTimeout(settle);
      rail.removeEventListener("scrollend", release);
      delete rail.dataset["dragging"];
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      release();
      id = e.pointerId;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      moved = false;
      samples = [{ x: e.clientX, t: e.timeStamp }];
    };

    const onMove = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      const dx = e.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < SLOP_PX) return;
        moved = true;
        rail.setPointerCapture(e.pointerId);
        // Snapping fights a drag that is still under the hand.
        rail.dataset["dragging"] = "";
      }
      rail.scrollLeft = startScroll - dx;
      samples.push({ x: e.clientX, t: e.timeStamp });
      if (samples.length > 5) samples.shift();
    };

    const onUp = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      id = null;
      if (!moved) return;
      if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);

      const first = samples[0];
      const last = samples[samples.length - 1];
      const speed = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
      const projected = rail.scrollLeft - speed * THROW_MS;

      const stops = Array.from(rail.children).map((_, i) => railStop(rail, i));
      let best = 0;
      stops.forEach((stop, i) => {
        if (Math.abs(stop - projected) < Math.abs((stops[best] ?? 0) - projected)) best = i;
      });

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rail.scrollTo({ left: stops[best] ?? 0, behavior: still ? "auto" : "smooth" });
      onSettle?.(best);
      // Snapping comes back once the glide has landed. Back any sooner and the
      // browser snaps from wherever the glide happens to be, which is a jump.
      settle = window.setTimeout(release, 700);
      rail.addEventListener("scrollend", release, { once: true });
    };

    // A drag that ends over a card must not also count as a click on it.
    const onClick = (e: MouseEvent) => {
      if (!moved) return;
      moved = false;
      e.preventDefault();
      e.stopPropagation();
    };

    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", onUp);
    rail.addEventListener("pointercancel", onUp);
    rail.addEventListener("click", onClick, true);
    return () => {
      release();
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", onUp);
      rail.removeEventListener("pointercancel", onUp);
      rail.removeEventListener("click", onClick, true);
    };
  }, [ref, onSettle]);
}

/**
 * The scroll position that brings card `index` to rest at the start of the
 * rail, measured rather than computed from a fixed card width so it holds
 * whatever the cards are sized to.
 */
export function railStop(rail: HTMLElement, index: number): number {
  const card = rail.children[index] as HTMLElement | undefined;
  if (!card) return 0;
  const pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
  return (
    rail.scrollLeft + card.getBoundingClientRect().left - rail.getBoundingClientRect().left - pad
  );
}
