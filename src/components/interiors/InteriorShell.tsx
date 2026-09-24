import type { ReactNode } from "react";
import { ExitToCrossroads, RegisterChip } from "@/components/site/Bits";
import { CrossroadsFooter, SiteFooter } from "@/components/site/PageShell";
import { Beam, Reveal } from "@/components/scene/Reveal";
import { RevealText } from "@/components/scene/RevealText";
import type { Scene } from "@/data/quantum";

/**
 * The room Events and Team are built from.
 *
 * One shell, two fills. The window, the rim light, the type scale and the
 * exit are identical in both; only the console content changes. Register and
 * Resources don't use this shell — each of their scenes is a photograph of an
 * actual desk with its own console already in the picture, so there is
 * nothing here for them to build around.
 *
 * The view through the window is a real frame from the descent film, so the
 * room sits in the same city the visitor just fell through.
 */
export function InteriorShell({
  scene,
  lead,
  leadBelow = false,
  children,
}: {
  scene: Scene;
  lead: string;
  /**
   * Put the lead under the content instead of above it. See PageShell's
   * `ledeBelow` for why: the room header was costing half the first screen,
   * and on Meet the Team it pushed the card deck clean off it.
   */
  leadBelow?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <ExitToCrossroads />
      <RegisterChip />
      <CrossroadsFooter variant="interior" />
      <main id="main" className="room phase-enter" data-accent={scene.accent} data-room={scene.id}>
        {scene.view ? (
          <div className="room-window" aria-hidden="true">
            <img src={scene.view} alt="" width={760} height={540} decoding="async" />
          </div>
        ) : null}
        <div className="room-rim" aria-hidden="true" />

        <Beam />

        <div className="room-body">
          <Reveal as="header" className="room-header">
            <p className="eyebrow">Quantum V2.0</p>
            <RevealText as="h1" className="room-title" text={scene.label} />
            {!leadBelow ? (
              <RevealText as="p" className="room-lead" text={lead} delay={0.12} />
            ) : null}
          </Reveal>
          {children}
          {leadBelow ? <p className="room-lead room-lead-below">{lead}</p> : null}
        </div>
      </main>

      {/* Phones only; see .interior-footer in styles.css. */}
      <div className="interior-footer">
        <SiteFooter />
      </div>
    </>
  );
}
