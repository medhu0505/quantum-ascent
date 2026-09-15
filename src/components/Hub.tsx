import { Link } from "@tanstack/react-router";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
import { announceEnter } from "@/components/scene/enterSignal";
import { crossroadsPlate, scenes, type Scene } from "@/data/quantum";

/**
 * The crossroads hub.
 *
 * The plate is the descent film's literal final frame, so arriving from the
 * scrubbed video is a cut between identical pixels rather than a match that
 * has to be eyeballed. The four signs are DOM elements welded onto real blank
 * billboards in that frame — measured off the plate, expressed as percentages
 * of the 1280x720 source, and carried here as custom properties.
 *
 * One list, two layouts: absolutely positioned onto the billboards on a wide
 * viewport, stacked as cards on a phone. See the hub section of styles.css.
 */

function Sign({ scene }: { scene: Scene }) {
  const phase = usePhaseLink(scene.to);

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
          "--sign-skew": `${scene.sign.skew}deg`,
          "--sign-lean": `${scene.sign.lean ?? 0}deg`,
          "--sign-yaw": `${scene.sign.yaw}deg`,
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
          <span className="sign-label">{scene.label}</span>
          <span className="sign-blurb">{scene.blurb}</span>
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
