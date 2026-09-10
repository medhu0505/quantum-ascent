import type { ReactNode } from "react";
import { ExitToCrossroads } from "@/components/site/Bits";
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
      <main id="main" className="room phase-enter" data-accent={scene.accent}>
        <div className="room-window" aria-hidden="true">
          <img src={scene.view} alt="" width={760} height={540} decoding="async" />
        </div>
        <div className="room-rim" aria-hidden="true" />

        <div className="room-body">
          <header className="room-header">
            <p className="eyebrow">Quantum V2.0</p>
            <h1 className="room-title">{scene.label}</h1>
            <p className="room-lead measure">{lead}</p>
          </header>
          {children}
        </div>
      </main>
    </>
  );
}
