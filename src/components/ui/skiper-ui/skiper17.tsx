import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cards that stack as the page scrolls: each one slides up over the last,
 * which shrinks and tips back as it goes under.
 *
 * Ported from Skiper 17 (StickyCard_002). Changed in porting:
 *  - The original pinned the stage with ScrollTrigger and wrapped the page in
 *    Lenis, which takes over scrolling for the whole document. Neither is kept.
 *    The stage is `position: sticky` inside a track as tall as the scrub, and
 *    ScrollTrigger only turns the scroll position into timeline progress, so
 *    the site keeps its native scroll and nothing is fixed to the viewport.
 *  - It takes any content for a card rather than images, and says which card is
 *    in front, so the page can keep its address and its own controls in step.
 *  - Cards that are not in front are `inert`, so a keyboard never lands on a
 *    link hidden behind another card; a row of buttons reaches every card.
 *  - With reduced motion, or no script, the cards are an ordinary list and
 *    nothing is pinned or scrubbed (see `.stack` in the stylesheet).
 */

export type StackCard = {
  id: string;
  name: string;
  background: string;
  accent: string;
  content: ReactNode;
};

type StickyStackProps = {
  cards: readonly StackCard[];
  startIndex?: number;
  onIndexChange?: (index: number) => void;
  label: string;
  hint?: string;
  className?: string;
};

export function StickyCard002({
  cards,
  startIndex = 0,
  onIndexChange,
  label,
  hint,
  className,
}: StickyStackProps) {
  const track = useRef<HTMLDivElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const cardEls = useRef<(HTMLElement | null)[]>([]);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(startIndex);
  // True once the cards are stacked and scrubbed. Until then, and for good
  // under reduced motion, every card is on the page and reachable.
  const [stacked, setStacked] = useState(false);
  const front = useRef(startIndex);
  const onChange = useRef(onIndexChange);
  onChange.current = onIndexChange;

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const total = cards.length;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const els = cardEls.current.slice(0, total);
        const trackEl = track.current;
        const stageEl = stage.current;
        if (total < 2 || els.some((el) => !el) || !trackEl || !stageEl) return;

        const [first, ...rest] = els as HTMLElement[];
        gsap.set(first!, { yPercent: 0, scale: 1, rotation: 0, autoAlpha: 1 });
        gsap.set(rest, { yPercent: 105, scale: 1, rotation: 0, autoAlpha: 1 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: trackEl,
            start: () => `top top+=${parseFloat(getComputedStyle(stageEl).top) || 0}`,
            end: () => `+=${Math.max(1, trackEl.offsetHeight - stageEl.offsetHeight)}`,
            scrub: 0.5,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const index = Math.round(self.progress * (total - 1));
              if (index === front.current) return;
              front.current = index;
              setActive(index);
              onChange.current?.(index);
            },
          },
        });
        for (let i = 0; i < total - 1; i++) {
          tl.to(els[i]!, { scale: 0.7, rotation: 5, duration: 1, ease: "none" }, i);
          tl.to(els[i + 1]!, { yPercent: 0, duration: 1, ease: "none" }, i);
        }

        const st = tl.scrollTrigger ?? null;
        trigger.current = st;
        setStacked(true);

        // Arrive on the event in the address, already in front.
        if (startIndex > 0 && st) {
          requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            const y = st.start + (startIndex / (total - 1)) * (st.end - st.start);
            window.scrollTo({ top: y, behavior: "instant" });
            tl.progress(startIndex / (total - 1));
          });
        }

        const resize = new ResizeObserver(() => ScrollTrigger.refresh());
        resize.observe(stageEl);
        return () => {
          resize.disconnect();
          trigger.current = null;
          setStacked(false);
        };
      });

      return () => mm.revert();
    },
    { scope: track, dependencies: [cards.length] },
  );

  const goTo = (index: number) => {
    const st = trigger.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (st) {
      const y = st.start + (index / Math.max(1, cards.length - 1)) * (st.end - st.start);
      window.scrollTo({ top: y, behavior: still ? "instant" : "smooth" });
    } else {
      cardEls.current[index]?.scrollIntoView({ block: "start", behavior: "auto" });
      cardEls.current[index]?.focus({ preventScroll: true });
    }
  };

  return (
    <div
      ref={track}
      className={cn("stack", className)}
      style={{ "--stack-cards": cards.length } as CSSProperties}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div ref={stage} className="stack-stage">
        <ol className="stack-frame">
          {cards.map((card, i) => (
            <li
              key={card.id}
              ref={(el) => {
                cardEls.current[i] = el;
              }}
              className="stack-card"
              data-accent={card.accent}
              style={{ background: card.background }}
              tabIndex={-1}
              aria-label={card.name}
              inert={stacked && i !== active}
            >
              {card.content}
            </li>
          ))}
        </ol>

        <nav className="stack-nav" aria-label="Choose an event">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              className="stack-nav-item"
              data-accent={card.accent}
              aria-current={i === active || undefined}
              onClick={() => goTo(i)}
            >
              <span className="stack-nav-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {card.name}
            </button>
          ))}
        </nav>
        {hint ? <p className="stack-hint">{hint}</p> : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {cards[active]?.name}
      </p>
    </div>
  );
}

/**
 * Skiper 17 StickyCard_002 — React + GSAP + ScrollTrigger
 * We respect the original creators. This is an inspired rebuild with our own taste and does not claim any ownership.
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
