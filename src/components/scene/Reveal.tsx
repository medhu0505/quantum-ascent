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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="beam" aria-hidden="true">
      <span className="beam-fill" style={{ transform: `scaleY(${progress})` }} />
    </div>
  );
}
