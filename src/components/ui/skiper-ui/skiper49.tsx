import { useEffect, useRef, type ReactNode } from "react";
import type { Swiper as SwiperClass } from "swiper";
import { A11y, EffectCoverflow, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";

import { cn } from "@/lib/utils";

/**
 * A coverflow carousel: the centred slide faces front and its neighbours turn
 * away on either side.
 *
 * Ported from Skiper 49 (Carousel_003). Dropped in porting: the demo images,
 * the framer-motion fade-in (a second animation runtime for a 300 ms fade),
 * and the stylesheet that recoloured every Swiper pagination bullet on the
 * page. It takes any slide content rather than images, is driven from outside
 * through `index`, and reports where it comes to rest through `onIndexChange`,
 * so the page can keep its own dots, counter and address in step with it.
 */

type CoverflowProps<T> = {
  items: readonly T[];
  index: number;
  onIndexChange: (index: number) => void;
  /** One slide's content. Rendered inside the slide, which is the page's to style. */
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T) => string;
  label: string;
  className?: string;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Carousel_003<T>({
  items,
  index,
  onIndexChange,
  renderItem,
  getKey,
  label,
  className,
}: CoverflowProps<T>) {
  const swiper = useRef<SwiperClass | null>(null);
  const first = useRef(index);

  // The page moved the index (a dot, an address): follow it. A slide change
  // the carousel made itself already matches, so nothing moves twice.
  useEffect(() => {
    const s = swiper.current;
    if (s && s.activeIndex !== index) s.slideTo(index, reducedMotion() ? 0 : undefined);
  }, [index]);

  return (
    <Swiper
      className={cn("m-coverflow", className)}
      modules={[EffectCoverflow, A11y, Keyboard]}
      effect="coverflow"
      coverflowEffect={{ rotate: 38, stretch: 0, depth: 110, modifier: 1, slideShadows: false }}
      slidesPerView="auto"
      centeredSlides
      grabCursor
      slideToClickedSlide
      keyboard={{ enabled: true, onlyInViewport: true }}
      speed={reducedMotion() ? 0 : 320}
      initialSlide={first.current}
      a11y={{ containerMessage: label, slideLabelMessage: "{{index}} of {{slidesLength}}" }}
      onSwiper={(s) => {
        swiper.current = s;
      }}
      onSlideChange={(s) => onIndexChange(s.activeIndex)}
    >
      {items.map((item, i) => (
        <SwiperSlide key={getKey(item)}>{renderItem(item, i)}</SwiperSlide>
      ))}
    </Swiper>
  );
}

/**
 * Skiper 49 Carousel_003 — React + Swiper
 * Built with Swiper.js - Read docs to learn more https://swiperjs.com/
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
