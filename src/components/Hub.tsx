import { Link } from "@tanstack/react-router";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
import { announceEnter } from "@/components/scene/enterSignal";
import { crossroadsPlate, scenes, type Scene } from "@/data/quantum";

/**
 * The crossroads hub.
 *
 * The plate is the descent film's literal final frame, so arriving from the
 * scrubbed video is a cut between identical pixels rather than a match that
 * has to be eyeballed. The signs are DOM elements welded onto the blank
 * holograms in that frame — each one's four corners measured off the plate,
 * expressed as percentages of the 1920x1080 source, and carried here as
 * custom properties. The panel is clipped to those corners, so it takes the
 * hologram's perspective without the label inside it being distorted.
 *
 * One list, two layouts: absolutely positioned onto the billboards on a wide
 * viewport, stacked as cards on a phone. See the hub section of styles.css.
 */

/**
 * Area centroid of the panel's quadrilateral, in the same percentages the
 * clip uses. The vertex average is not good enough here: these are strong
 * trapezoids, and on the two big boards it sits noticeably off the shape's
 * visual middle.
 */
function signCentre(clip: [number, number][]): [number, number] {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < clip.length; i++) {
    const [x0, y0] = clip[i]!;
    const [x1, y1] = clip[(i + 1) % clip.length]!;
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (area === 0) return [50, 50];
  return [cx / (3 * area), cy / (3 * area)];
}

function Sign({ scene }: { scene: Scene }) {
  const phase = usePhaseLink(scene.to);
  const [centreX, centreY] = signCentre(scene.sign.clip);

  // The veil that flies the flat plate at the sign runs either way. When the
  // geometry is live the camera goes with it, so the cut is a move through the
  // street rather than a picture sliding over one.
  const onPhase = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey) {
      announceEnter(scene.id);
    }
    phase(event);
  };

  return (
    <li
      data-accent={scene.accent}
      style={
        {
          "--sign-left": scene.sign.left,
          "--sign-top": scene.sign.top,
          "--sign-width": scene.sign.width,
          "--sign-height": scene.sign.height,
          // The panel is clipped to the hologram's own four corners, so the
          // billboard's perspective comes from the shape rather than from a
          // transform the label would have to share.
          "--sign-clip": scene.sign.clip.map(([x, y]) => `${x}% ${y}%`).join(", "),
          // A trapezoid's centre is not the centre of the box around it, and
          // a label centred on the box reads as sitting high on the panel.
          // Centre it on the shape instead.
          "--sign-shift-x": `${(centreX - 50).toFixed(2)}%`,
          "--sign-shift-y": `${(centreY - 50).toFixed(2)}%`,
          "--sign-haze": scene.sign.haze,
          // Written per frame by CrossroadsGL from the same camera that draws
          // the street. Zero until the GL layer is live, which is what the
          // flat-parallax fallback below keys off.
          "--sign-dx": `var(--gl-sign-${scene.id}-x, 0px)`,
          "--sign-dy": `var(--gl-sign-${scene.id}-y, 0px)`,
        } as React.CSSProperties
      }
    >
      <Link
        to={scene.to}
        className="sign"
        data-vertical={scene.sign.vertical ? "true" : undefined}
        data-compact={scene.sign.compact ? "true" : undefined}
        preload="intent"
        onClick={onPhase}
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
