import type { ReactNode } from "react";
import { ExitToCrossroads, RegisterChip } from "@/components/site/Bits";
import { Beam, Reveal } from "@/components/scene/Reveal";
import { RevealText } from "@/components/scene/RevealText";
import type { Scene } from "@/data/quantum";

/**
 * The room every interior is built from.
 *
 * One shell, four fills. The window, the rim light, the type scale and the
 * exit are identical in all four scenes; only the console content changes.
 * Building them from a single component is what keeps the interiors one
 * system rather than four independently-vibed rooms — and it means an
 * accessibility or layout fix lands in all of them at once.
 *
 * The view through the window is a real frame from the descent film, so the
 * room sits in the same city the visitor just fell through.
 */
export function InteriorShell({
  scene,
  lead,
  children,
}: {
  scene: Scene;
  lead: string;
  children: ReactNode;
}) {
  return (
    <>
      <ExitToCrossroads />
      <RegisterChip hidden={scene.id === "register"} />
      <main id="main" className="room phase-enter" data-accent={scene.accent}>
        <div className="room-window" aria-hidden="true">
          <img src={scene.view} alt="" width={760} height={540} decoding="async" />
        </div>
        <div className="room-rim" aria-hidden="true" />

        <Beam />

        <div className="room-body">
          <Reveal as="header" className="room-header">
            <p className="eyebrow">Quantum V2.0</p>
            <RevealText as="h1" className="room-title" text={scene.label} />
            <RevealText as="p" className="room-lead" text={lead} delay={0.12} />
          </Reveal>
          {children}
        </div>
      </main>
    </>
  );
}
