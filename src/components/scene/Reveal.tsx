import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Scroll-triggered entrance.
 *
 * Content that simply exists on load is the single clearest tell that a page
 * was assembled rather than composed. Everything here arrives: a short rise
 * and fade, staggered down the group so the eye is led through the order the
 * layout intends rather than seeing it all land at once.
 *
 * Observed once and then released — a reveal that replays on every scroll-by
 * turns into a nervous tic. Under reduced motion the observer is skipped
 * entirely and the content is simply present.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  /** Stagger index; multiplied by a fixed step so groups share a cadence. */
  delay?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    // Belt and braces: if the observer never fires — an old engine, a
    // detached subtree — show the content rather than stranding it.
    const safety = window.setTimeout(() => setShown(true), 2500);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(safety);
      io.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      data-shown={shown || undefined}
      style={{ "--reveal-delay": `${delay * 70}ms` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * The beam.
 *
 * The film's signature image is a column of light falling from the moon into
 * the street. It becomes the site's one persistent mark: a hairline down the
 * leading edge of every room and page that fills as you read. It is the
 * through-line that ties five separate screens to one film — and it doubles
 * as an honest reading-progress indicator.
 */
export function Beam() {
  const fillRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /*
     * Drawn when the page scrolls or changes size, and at most once a frame.
     * It used to re-render through React state on every frame for the life
     * of the page, reading the document's height each time, whether or not
     * anything had moved. The height is measured only when the page resizes
     * and the fill is written straight onto the node.
     */
    let max = 0;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const p = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      fill.style.transform = `scaleY(${p})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
      schedule();
    };

    // The body grows as a room's content loads in and FAQ answers open.
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", schedule, { passive: true });
    measure();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <div className="beam" aria-hidden="true">
      <span ref={fillRef} className="beam-fill" style={{ transform: "scaleY(0)" }} />
    </div>
  );
}
