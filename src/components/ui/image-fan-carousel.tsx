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
    if (!autoplay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setRotation((r) => r + angleStep), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, paused, angleStep, count]);

  const rotate = useCallback(
    (dir: "left" | "right") => setRotation((r) => r + (dir === "left" ? -angleStep : angleStep)),
    [angleStep],
  );

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
      <div className="fan-stage" ref={containerRef}>
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
