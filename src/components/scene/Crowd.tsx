/**
 * Street life.
 *
 * The crossroads plate is a still of an empty city, which reads as abandoned
 * rather than atmospheric. These are pedestrians walking the pavements and
 * crossing the junction.
 *
 * Two things make them read as being *in* the scene rather than on top of it:
 *
 *   Perspective. Each walker sits in a lane with a depth value. Depth drives
 *   size, speed, opacity and blur together — figures near the vanishing point
 *   are small, slow, hazy and dim; figures near the camera are large, quick
 *   and sharp. Getting any one of those wrong is what makes overlays look
 *   pasted on.
 *
 *   Light. They are silhouettes, not sprites. The city is behind them, so
 *   they read as occlusions of it, picking up a neon rim from whichever side
 *   of the street they are on.
 *
 * Coordinates are percentages of the film's 1280x720 frame, measured against
 * the pavements and the crossing in the plate.
 */

type Lane = {
  /** Vertical position on the plate, in percent. */
  y: number;
  /** 0 = at the vanishing point, 1 = closest to camera. Drives everything. */
  depth: number;
  /** Travel direction across the frame. */
  dir: "ltr" | "rtl";
  /** Horizontal span of the walk, in percent of frame width. */
  from: number;
  to: number;
  /** Which neon bank rims this walker. */
  rim: "cyan" | "magenta";
  /** Seconds for one crossing, and the offset into that cycle. */
  duration: number;
  delay: number;
};

const LANES: Lane[] = [
  /*
   * The street is a perspective corridor: the further up the frame a lane
   * sits, the narrower the walkable band, converging on the vanishing point
   * at roughly x 50%. Putting a distant figure at x 12% would stand it inside
   * a building, which is exactly the kind of mistake that breaks the illusion.
   *
   *   y 71%  near crossing   road 20-80%   pavements  5-18% / 82-95%
   *   y 67%  mid street      road 33-67%   pavements 22-32% / 68-78%
   *   y 64%  far street      road 40-60%   pavements 34-39% / 61-66%
   */

  // Far pavements — small, slow, hazy, hugging the vanishing point.
  { y: 63.8, depth: 0.16, dir: "ltr", from: 34, to: 39, rim: "cyan", duration: 40, delay: 0 },
  { y: 64.2, depth: 0.2, dir: "rtl", from: 66, to: 61, rim: "magenta", duration: 37, delay: -11 },
  { y: 64.6, depth: 0.24, dir: "ltr", from: 61, to: 67, rim: "magenta", duration: 34, delay: -25 },

  // Mid pavements.
  { y: 66.6, depth: 0.4, dir: "ltr", from: 23, to: 32, rim: "cyan", duration: 31, delay: -5 },
  { y: 67.1, depth: 0.44, dir: "rtl", from: 32, to: 22, rim: "cyan", duration: 29, delay: -19 },
  { y: 66.9, depth: 0.42, dir: "rtl", from: 78, to: 68, rim: "magenta", duration: 33, delay: -14 },
  { y: 67.4, depth: 0.47, dir: "ltr", from: 69, to: 77, rim: "magenta", duration: 27, delay: -8 },

  // Crossing the junction on the zebra — the only figures on the road.
  { y: 70.8, depth: 0.7, dir: "ltr", from: 30, to: 68, rim: "cyan", duration: 23, delay: -3 },
  { y: 71.6, depth: 0.76, dir: "rtl", from: 70, to: 33, rim: "magenta", duration: 26, delay: -17 },

  // Near pavements — largest, quickest, sharpest.
  { y: 72.4, depth: 0.9, dir: "ltr", from: 5, to: 17, rim: "cyan", duration: 21, delay: -12 },
  { y: 72.8, depth: 0.95, dir: "rtl", from: 94, to: 83, rim: "magenta", duration: 19, delay: -6 },
];

export function Crowd() {
  return (
    <div className="crowd" aria-hidden="true">
      {LANES.map((lane, i) => (
        <span
          key={i}
          className="walker"
          data-rim={lane.rim}
          style={
            {
              // Ground line: --y is where the feet land, not the head.
              "--y": `${lane.y}%`,
              // Container units, not percentages. A percentage translate
              // resolves against the element's own width, which stacked every
              // walker at the left edge a few pixels wide.
              "--from": `${lane.from}cqi`,
              "--to": `${lane.to}cqi`,
              // Depth drives scale, haze and dimming as one value, so a
              // figure can never be small-but-sharp or large-but-faint.
              "--depth": lane.depth,
              "--dur": `${lane.duration}s`,
              "--delay": `${lane.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
