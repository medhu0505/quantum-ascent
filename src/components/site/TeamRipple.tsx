import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { crossroadsPlate } from "@/data/quantum";

/**
 * A strip of the crossroads under the ring on Meet the Team. Move across it
 * and the street ripples. The picture is an ordinary image that is there
 * first; the WebGL layer (three.js, loaded only here) goes over it once the
 * strip is near the screen, and only for people who have not asked for less
 * motion. With no WebGL the picture simply stays.
 */
const Ripple = lazy(() =>
  import("@/components/ui/image-ripple-effect").then((m) => ({ default: m.ImageRippleEffect })),
);

const IMAGES = [
  {
    src: crossroadsPlate.webp,
    x: 0,
    y: 0,
    widthScale: 1,
    heightScale: crossroadsPlate.height / crossroadsPlate.width,
  },
];

export function TeamRipple() {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLive(true);
        seen.disconnect();
      },
      { rootMargin: "200px" },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  return (
    <div ref={box} className="team-ripple" aria-hidden="true">
      <img
        src={crossroadsPlate.webp}
        alt=""
        width={crossroadsPlate.width}
        height={crossroadsPlate.height}
        loading="lazy"
        decoding="async"
      />
      {live ? (
        <Suspense fallback={null}>
          <Ripple className="absolute inset-0 h-full" images={IMAGES} />
        </Suspense>
      ) : null}
    </div>
  );
}
