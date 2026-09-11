import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * A stack of portraits that deals like a hand of cards, with the quote for
 * whichever is on top.
 *
 * Ported off the original's Next-only pieces: `<style jsx>` is not a thing
 * outside Next, so the styling lives in styles.css with the rest of the site,
 * and the motion is CSS rather than Framer so this does not drag a second
 * animation runtime in beside the one the rest of the site already uses.
 */

export interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}

export interface TestimonialColors {
  name?: string;
  designation?: string;
  testimony?: string;
  arrowBackground?: string;
  arrowForeground?: string;
  arrowHoverBackground?: string;
}

export interface TestimonialFontSizes {
  name?: string;
  designation?: string;
  quote?: string;
}

/** The original's gap curve, kept: 60px narrow, easing out to 86px and beyond. */
function calculateGap(width: number): number {
  const minWidth = 1024;
  const maxWidth = 1456;
  const minGap = 60;
  const maxGap = 86;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth) return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

const AUTOPLAY_MS = 5000;

export function CircularTestimonials({
  testimonials,
  autoplay = true,
  colors = {},
  fontSizes = {},
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
  colors?: TestimonialColors;
  fontSizes?: TestimonialFontSizes;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = testimonials.length;
  // Indexing is guarded rather than asserted: an empty list is a legitimate
  // state while the roster is still being filled in, and a carousel that
  // throws on it would take the whole page down with it.
  const active = testimonials[activeIndex];

  const next = useCallback(() => setActiveIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setActiveIndex((i) => (i - 1 + count) % count), [count]);

  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timerRef.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // Re-armed on activeIndex so a manual step restarts the clock rather than
    // leaving the next auto-advance to fire a fraction of a second later.
  }, [autoplay, paused, count, next, activeIndex]);

  // Scoped to the carousel. Binding arrow keys to the window would swallow
  // them everywhere else on the page — inside text fields, selects, and any
  // scroll container — for a widget the visitor may not even be looking at.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  const gap = useMemo(() => calculateGap(containerWidth), [containerWidth]);
  const stickUp = gap * 0.8;

  function slot(index: number): { className: string; style: React.CSSProperties } {
    if (index === activeIndex) {
      return { className: "testimonial-image is-active", style: { transform: "none" } };
    }
    if ((activeIndex - 1 + count) % count === index) {
      return {
        className: "testimonial-image is-left",
        style: { transform: `translate3d(${-gap}px, ${-stickUp}px, 0) scale(.85) rotateY(15deg)` },
      };
    }
    if ((activeIndex + 1) % count === index) {
      return {
        className: "testimonial-image is-right",
        style: { transform: `translate3d(${gap}px, ${-stickUp}px, 0) scale(.85) rotateY(-15deg)` },
      };
    }
    return { className: "testimonial-image is-hidden", style: {} };
  }

  if (!active) return null;

  const style = {
    "--tc-name": colors.name ?? "var(--foreground)",
    "--tc-designation": colors.designation ?? "var(--muted-foreground)",
    "--tc-quote": colors.testimony ?? "color-mix(in oklab, var(--foreground) 86%, transparent)",
    "--tc-arrow-bg": colors.arrowBackground ?? "var(--card)",
    "--tc-arrow-fg": colors.arrowForeground ?? "var(--foreground)",
    "--tc-arrow-hover": colors.arrowHoverBackground ?? "var(--neon-cyan)",
    "--tc-size-name": fontSizes.name ?? "var(--text-2xl)",
    "--tc-size-designation": fontSizes.designation ?? "var(--text-sm)",
    "--tc-size-quote": fontSizes.quote ?? "var(--text-base)",
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className="testimonial-container"
      style={style}
      role="group"
      aria-roledescription="carousel"
      aria-label="Team"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="testimonial-grid">
        <div className="image-container" ref={imageContainerRef}>
          {testimonials.map((t, index) => {
            const s = slot(index);
            return (
              <img
                key={t.src || t.name}
                src={t.src}
                alt=""
                width={480}
                height={480}
                loading="lazy"
                decoding="async"
                className={s.className}
                style={s.style}
                aria-hidden={index !== activeIndex}
              />
            );
          })}
        </div>

        <div className="testimonial-content">
          {/* Polite, not assertive: the quote changing on a timer should reach
              a screen reader at a pause, never cut across what it is reading. */}
          <div className="testimonial-live" aria-live="polite" aria-atomic="true">
            <div key={activeIndex} className="testimonial-card">
              <h3 className="testimonial-name">{active.name}</h3>
              <p className="testimonial-designation">{active.designation}</p>
              <p className="testimonial-quote">
                {active.quote.split(" ").map((word, i) => (
                  <span key={`${activeIndex}-${i}`} style={{ "--i": i } as React.CSSProperties}>
                    {word}{" "}
                  </span>
                ))}
              </p>
            </div>
          </div>

          <div className="arrow-buttons">
            <button type="button" className="arrow-button" onClick={prev} aria-label="Previous">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" className="arrow-button" onClick={next} aria-label="Next">
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CircularTestimonials;
