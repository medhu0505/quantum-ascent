import { Link } from "@tanstack/react-router";
import { Ambient } from "@/components/scene/Ambient";
import { Crowd } from "@/components/scene/Crowd";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
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
  const onPhase = usePhaseLink(scene.to);

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
          "--sign-yaw": `${scene.sign.yaw}deg`,
          "--sign-haze": scene.sign.haze,
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

/** Standalone hub, for any entry point that is not the scrubbed descent. */
export function Hub() {
  return (
    <div className="hub">
      <div className="hub-stage">
        <HubPlate eager />
        <div className="hub-scrim" />
        <Ambient />
        <Crowd />
        <HubSigns />
      </div>
    </div>
  );
}
