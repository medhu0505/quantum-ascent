import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A single blurred, raked ellipse — the cheapest convincing way to put a light
 * source on a dark surface. It is pure SVG, so it costs nothing at runtime and
 * survives with images and JavaScript both off.
 *
 * The filter id is generated per instance. A hardcoded one breaks the moment
 * two spotlights share a page: duplicate ids are invalid, and every
 * `filter="url(#…)"` resolves to whichever element the parser saw first, so
 * the second spotlight silently borrows the first one's geometry.
 */
export function Spotlight({ className, fill }: { className?: string; fill?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      className={cn("spotlight", className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g filter={`url(#${id})`}>
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill ?? "white"}
          fillOpacity="0.18"
        />
      </g>
      <defs>
        <filter
          id={id}
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="blur" />
        </filter>
      </defs>
    </svg>
  );
}
