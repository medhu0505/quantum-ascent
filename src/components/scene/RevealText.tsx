import { useEffect, useRef, useState, type ElementType } from "react";

/**
 * Masked line reveal.
 *
 * Headings arrive a line at a time, each rising out of its own clipped band
 * with a short stagger — the effect every one of the reference sites opens
 * with. The reason it reads as expensive is that the mask is per *line*, not
 * per element: the text appears to be uncovered by the layout rather than
 * faded in on top of it.
 *
 * Lines cannot be known ahead of time — they depend on the final width, the
 * font, and where the browser decides to break. So the text is rendered
 * normally first, words are measured, and words sharing a vertical offset are
 * grouped into a line. That also means it has to re-run on resize.
 *
 * The plain string is rendered on the server and before measurement, so the
 * heading is real text to a crawler and to a reader with JS off.
 */
export function RevealText({
  as: Tag = "span",
  text,
  className = "",
  delay = 0,
}: {
  as?: ElementType;
  text: string;
  className?: string;
  /** Seconds before the first line moves. */
  delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [shown, setShown] = useState(false);

  // Measure where the browser actually broke the text.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const measure = () => {
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
      probe.style.width = `${el.clientWidth}px`;
      probe.className = el.className;
      const words = text.split(" ");
      probe.innerHTML = words.map((w) => `<span>${w}</span>`).join(" ");
      el.appendChild(probe);

      const found: string[] = [];
      let top: number | null = null;
      probe.querySelectorAll("span").forEach((span, i) => {
        const y = (span as HTMLElement).offsetTop;
        if (top === null || y > top + 2) {
          top = y;
          found.push(words[i]!);
        } else {
          found[found.length - 1] += ` ${words[i]}`;
        }
      });
      el.removeChild(probe);
      setLines(found.length ? found : [text]);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  // Reveal when it scrolls into view, once.
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag ref={ref} className={`reveal-text ${className}`.trim()} data-shown={shown || undefined}>
      {lines
        ? lines.map((line, i) => (
            <span className="reveal-line" key={`${line}-${i}`}>
              <span
                className="reveal-line-inner"
                style={{ transitionDelay: `${delay + i * 0.085}s` }}
              >
                {line}
              </span>
            </span>
          ))
        : text}
    </Tag>
  );
}
