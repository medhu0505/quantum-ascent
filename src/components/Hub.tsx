import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
import { crossroadsPlate, scenes, type Scene } from "@/data/quantum";

/**
 * The crossroads hub.
 *
 * The plate is the descent film's literal final frame, so arriving from the
 * scrubbed video is a cut between identical pixels rather than a match that
 * has to be eyeballed. The signs are DOM elements welded onto the blank
 * holograms in that frame — each one's four corners measured off the plate
 * and expressed as percentages of the 1920x1080 source. Each panel is then
 * corner-pinned onto its own four corners, so it stands on the billboard's
 * plane rather than square-on to the camera in front of it.
 *
 * One list, two layouts: absolutely positioned onto the billboards on a wide
 * viewport, stacked as cards on a phone. See the hub section of styles.css.
 */

type Pinned = { matrix: string; unpin: string };

/**
 * The transform that lays a panel onto its billboard.
 *
 * Clipping a flat rectangle to the hologram's outline got the shape right
 * and the plane wrong: the panel was still square-on to the camera with a
 * quadrilateral cut out of it, so the label sat upright on a board that is
 * turned away from us. This is the projective transform that maps the
 * panel's own rectangle onto those same four corners — the standard
 * unit-square homography, composed with the element's size so it works in
 * the element's own coordinates.
 *
 * The perspective divide lives in the matrix's fourth row, so there is no
 * parent `perspective` to set and nothing else in the tree has to know.
 * Everything inside rides along: the panel is a plane standing in the
 * street, and the text on it is painted on that plane rather than floating
 * in front of it.
 *
 * The label does not ride it. It carries the inverse of the same matrix, so
 * the two cancel and the type renders at its true proportions over a panel
 * that is still pinned to the board — angled surface, undistorted words.
 */
function quadPin(clip: [number, number][], w: number, h: number): Pinned | undefined {
  if (clip.length !== 4 || w <= 0 || h <= 0) return undefined;

  const [c0, c1, c2, c3] = clip as [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
  const [x0, y0] = [(c0[0] / 100) * w, (c0[1] / 100) * h];
  const [x1, y1] = [(c1[0] / 100) * w, (c1[1] / 100) * h];
  const [x2, y2] = [(c2[0] / 100) * w, (c2[1] / 100) * h];
  const [x3, y3] = [(c3[0] / 100) * w, (c3[1] / 100) * h];

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dy1 * dx2;
  if (!den) return undefined;

  const g = (sx * dy2 - sy * dx2) / den;
  const k = (dx1 * sy - dy1 * sx) / den;

  // Homography in the panel's own pixels: (x, y) -> (X, Y), divided by W.
  const a = (x1 - x0 + g * x1) / w;
  const d = (y1 - y0 + g * y1) / w;
  const gw = g / w;
  const b = (x3 - x0 + k * x3) / h;
  const e = (y3 - y0 + k * y3) / h;
  const kh = k / h;

  const m = [a, d, 0, gw, b, e, 0, kh, 0, 0, 1, 0, x0, y0, 0, 1];
  const matrix = `matrix3d(${m.map((n) => Number(n.toFixed(6))).join(",")})`;

  /*
   * And the way back out of it.
   *
   * The panel has to take the board's perspective; the words on it must
   * not. Run through the pin, type is stretched wide at the near edge and
   * squeezed at the far one, and the letterforms stop being the typeface —
   * which is what makes it look wrong rather than angled.
   *
   * So the content layer carries the inverse of the same matrix. The two
   * compose to the identity, the label renders at its true proportions in
   * the panel's own rectangle, and the glass underneath it stays pinned to
   * the hologram. Adjugate rather than a full inverse: the scale it carries
   * cancels in the perspective divide, and normalising by the last entry
   * keeps the matrix in the form CSS expects.
   */
  const iA = e - y0 * kh;
  const iB = x0 * kh - b;
  const iC = b * y0 - x0 * e;
  const iD = y0 * gw - d;
  const iE = a - x0 * gw;
  const iF = x0 * d - a * y0;
  const iG = d * kh - e * gw;
  const iK = b * gw - a * kh;
  const iL = a * e - b * d;
  if (!iL) return undefined;

  const inv = [
    iA / iL,
    iD / iL,
    0,
    iG / iL,
    iB / iL,
    iE / iL,
    0,
    iK / iL,
    0,
    0,
    1,
    0,
    iC / iL,
    iF / iL,
    0,
    1,
  ];
  const unpin = `matrix3d(${inv.map((n) => Number(n.toFixed(6))).join(",")})`;

  return { matrix, unpin };
}

/* Before paint, not after: see the effect below. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Sign({ scene }: { scene: Scene }) {
  const phase = usePhaseLink(scene.to);
  const ref = useRef<HTMLLIElement | null>(null);
  const [pin, setPin] = useState<Pinned | undefined>(undefined);

  /*
   * The matrix is in the panel's own pixels, so it is recomputed whenever
   * the stage resizes. Measured with offsetWidth rather than a bounding
   * rect: a rect reports the transformed box, which would feed the
   * transform its own output. Below the billboard breakpoint the signs are
   * stacked cards and there is no board to lie on, so there is no matrix.
   *
   * A layout effect, because a passive one runs after the browser has
   * already painted: the panel went up as a plain axis-aligned rectangle in
   * its own accent colour, sat there for a few hundred milliseconds nowhere
   * near its hologram, and then snapped onto the board. That was the pink
   * rectangle flashing over the film on load, on resize, and every time the
   * crossroads remounted on the way back from a room. The stylesheet holds
   * the panel back until it is pinned as well, so a frame can never get out
   * before the matrix does.
   */
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 48rem) and (min-aspect-ratio: 5 / 4)");

    const update = () => {
      setPin(wide.matches ? quadPin(scene.sign.clip, el.offsetWidth, el.offsetHeight) : undefined);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    wide.addEventListener("change", update);
    return () => {
      ro.disconnect();
      wide.removeEventListener("change", update);
    };
  }, [scene.sign.clip]);

  return (
    <li
      ref={ref}
      data-accent={scene.accent}
      data-pinned={pin ? "" : undefined}
      style={
        {
          "--sign-left": scene.sign.left,
          "--sign-top": scene.sign.top,
          "--sign-width": scene.sign.width,
          "--sign-height": scene.sign.height,
          "--sign-haze": scene.sign.haze,
          ...(pin ? { transform: pin.matrix, "--sign-unpin": pin.unpin } : {}),
        } as React.CSSProperties
      }
    >
      <Link
        to={scene.to}
        className="sign"
        data-vertical={scene.sign.vertical ? "true" : undefined}
        data-compact={scene.sign.compact ? "true" : undefined}
        preload="intent"
        onClick={phase}
        data-cursor-label="Enter"
      >
        <span className="sign-face">
          <span className="sign-inner">
            <span className="sign-label">{scene.label}</span>
            <span className="sign-blurb">{scene.blurb}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export function HubSigns({ inert }: { inert?: boolean }) {
  return (
    <nav aria-label="Quantum V2.0 sections" inert={inert || undefined}>
      <ul className="hub-signs">
        {scenes.map((scene) => (
          <Sign key={scene.id} scene={scene} />
        ))}
      </ul>
    </nav>
  );
}

export function HubPlate({ eager = false }: { eager?: boolean }) {
  return (
    <picture>
      <source srcSet={crossroadsPlate.webp} type="image/webp" />
      <img
        className="hub-plate"
        src={crossroadsPlate.jpg}
        alt={crossroadsPlate.alt}
        width={crossroadsPlate.width}
        height={crossroadsPlate.height}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        fetchPriority={eager ? "high" : "auto"}
      />
    </picture>
  );
}
