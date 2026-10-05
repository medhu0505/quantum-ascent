import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * A ring of thumbnails turning in 3D, with the one at the front shown large in
 * the middle.
 *
 * Ported off Next: `next/image` does not exist here, so these are plain
 * `<img>` with explicit dimensions and lazy loading, and the ring turns on CSS
 * transitions rather than a Framer spring — same overshoot, no second
 * animation runtime. Images are passed in with alt text rather than hardcoded
 * as bare URLs against someone else's CDN.
 *
 * Three ways to drive it: drag the ring, tap a card to bring it to the front,
 * or use the arrows. The ring itself is `aria-hidden` and every card on it
 * reaches the front anyway, so the pointer gestures are enhancements over the
 * arrow buttons and arrow keys rather than the only way in — which is why the
 * cards are not focusable controls of their own.
 */

export interface FanImage {
  /** Leave empty for an entry whose picture has not been supplied yet. */
  src?: string;
  alt: string;
  /** Stands in for a missing picture: initials, a number, a short label. */
  stand?: string;
}

const AUTOPLAY_MS = 2400;
const RADIUS_MIN = 120;
const RADIUS_MAX = 320;
const RADIUS_WIDTH_RATIO = 0.55;
const PERSPECTIVE_MULTIPLIER = 2.4;
const RING_TILT_DEG = 38;
/**
 * Degrees the ring turns per pixel dragged. At this rate a card's worth of
 * rotation is about a thumbnail's width of travel, so the ring moves with the
 * hand rather than spinning away from it.
 */
const DEG_PER_PX = 0.35;
/** Travel below which a press is a tap on a card, not a drag of the ring. */
const DRAG_SLOP_PX = 6;

export function Carousel360({
  images,
  autoplay = true,
}: {
  images: FanImage[];
  autoplay?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [radius, setRadius] = useState(220);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    id: number;
    x: number;
    from: number;
    moved: boolean;
    index: number | null;
  } | null>(null);

  const count = images.length;
  const angleStep = count ? 360 / count : 0;

  const steps = angleStep ? Math.round(rotation / angleStep) : 0;
  const centerIndex = count ? ((-steps % count) + count) % count : 0;
  const centre = images[centerIndex];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // A share of the width alone overflows: the thumbnails are hung at the
    // radius, so half of one sticks out past it. On a phone that put the ring
    // through both edges of the screen. The cap keeps the whole ring, thumbs
    // included, inside the stage, and the thumbnail is measured rather than
    // assumed because its size is a clamp() the stylesheet owns.
    const measure = () => {
      const width = el.offsetWidth;
      if (!width) return;
      const thumb = thumbRef.current?.offsetWidth ?? 96;
      const room = width / 2 - thumb * 0.75;
      setRadius(Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, width * RADIUS_WIDTH_RATIO, room)));
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || paused || dragging || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setRotation((r) => r + angleStep), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, paused, dragging, angleStep, count]);

  const rotate = useCallback(
    (dir: "left" | "right") => setRotation((r) => r + (dir === "left" ? -angleStep : angleStep)),
    [angleStep],
  );

  /**
   * Turn the ring so `index` comes to the front, the short way round — from
   * card 7 of 8, card 0 is one step forward, not seven steps back.
   */
  const centreOn = useCallback(
    (index: number) => {
      if (!count || !angleStep) return;
      setRotation((r) => {
        const steps = Math.round(r / angleStep);
        let delta = (((-index - steps) % count) + count) % count;
        if (delta > count / 2) delta -= count;
        return (steps + delta) * angleStep;
      });
    },
    [angleStep, count],
  );

  /* ---- Drag the ring ------------------------------------------------ *
   * Pointer capture keeps the gesture alive past the edge of the stage,
   * which means the release lands here rather than nowhere. It also
   * retargets every later event to the stage, so which card was pressed has
   * to be noted now, on the way down, while the target is still the card.
   */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-fan-index]");
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      from: rotation,
      moved: false,
      index: card ? Number(card.dataset["fanIndex"]) : null,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > DRAG_SLOP_PX) d.moved = true;
    if (d.moved) setRotation(d.from + dx * DEG_PER_PX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);

    if (!d.moved) {
      // A tap, not a drag: bring the card that was pressed to the front.
      if (d.index !== null) centreOn(d.index);
      return;
    }
    // Let go mid-turn and the nearest card takes the front, so the ring is
    // never left sitting between two of them.
    if (angleStep) setRotation((r) => Math.round(r / angleStep) * angleStep);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      rotate("left");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      rotate("right");
    }
  };

  if (!centre) return null;

  return (
    <div
      className="fan"
      data-dragging={dragging || undefined}
      role="group"
      aria-roledescription="carousel"
      aria-label="Inside the fest"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="fan-stage"
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* The ring itself is decoration: every thumbnail on it is also the
            centre image a moment later, so announcing all ten would just read
            the same list over and over. */}
        <div
          className="fan-ring"
          aria-hidden="true"
          style={{ perspective: `${radius * PERSPECTIVE_MULTIPLIER}px` }}
        >
          {images.map((img, index) => {
            const angle = rotation + angleStep * index;
            return (
              <div
                key={img.src ?? img.alt}
                className="fan-orbit"
                style={{ transform: `rotateY(${angle}deg)` }}
              >
                <div
                  ref={index === 0 ? thumbRef : undefined}
                  className="fan-thumb"
                  data-fan-index={index}
                  style={{
                    transform: `translateZ(${radius}px) rotateX(${RING_TILT_DEG}deg) rotateY(${-angle}deg)`,
                  }}
                >
                  {img.src ? (
                    <img
                      src={img.src}
                      alt=""
                      width={192}
                      height={192}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <span className="fan-blank">{img.stand}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fan-centre" aria-live="polite" aria-atomic="true">
          <figure key={centerIndex} className="fan-centre-card">
            {centre.src ? (
              <img
                src={centre.src}
                alt={centre.alt}
                width={640}
                height={640}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="fan-blank is-centre" aria-hidden="true">
                {centre.stand}
              </span>
            )}
            <figcaption>{centre.alt}</figcaption>
          </figure>
        </div>
      </div>

      <div className="fan-controls">
        <button
          type="button"
          className="fan-button"
          onClick={() => rotate("left")}
          aria-label="Previous image"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fan-button"
          onClick={() => rotate("right")}
          aria-label="Next image"
        >
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Carousel360;
