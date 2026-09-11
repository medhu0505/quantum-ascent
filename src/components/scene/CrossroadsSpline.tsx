import { Component, type ReactNode, useEffect, useState } from "react";
import { CROSSROADS_SPLINE_SCENE } from "@/data/quantum";
import { SplineScene } from "@/components/ui/splite";

/**
 * The Spline centrepiece, standing in the intersection.
 *
 * Parked in percentages of the stage rather than pixels, so it tracks the
 * plate through every viewport the stage is framed at. It composites over the
 * street rather than standing in it — a second WebGL context has no access to
 * the plate's depth buffer — so unlike the native core the road cannot occlude
 * it. `onReady` is the handshake that stands the native core down, so the
 * intersection is never empty while the scene is still on its way.
 *
 * Nothing mounts until the scene file has been fetched successfully. That is
 * not caution for its own sake: rendering Spline against a scene that never
 * arrives suspends during hydration and takes the whole crossroads with it —
 * the film never resolves, and the page sits on its loading screen forever.
 * A school network that blocks or throttles prod.spline.design would otherwise
 * cost the entire page rather than just the robot. Probing first keeps the
 * failure where it belongs, and the response is cached, so Spline's own fetch
 * is a cache hit rather than a second download.
 *
 * Withheld on coarse pointers too. This is a second WebGL context and a
 * multi-megabyte download from a third party, which is not what most of a
 * school fest's traffic should be spending its connection on.
 */

const REACH_MS = 6000;

/** A throw inside Spline's runtime must cost the robot, never the street. */
class SplineBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function CrossroadsSpline({ onReady }: { onReady?: () => void }) {
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    if (!CROSSROADS_SPLINE_SCENE) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REACH_MS);
    let live = true;

    fetch(CROSSROADS_SPLINE_SCENE, { signal: controller.signal })
      .then((res) => {
        if (live && res.ok) setReachable(true);
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timer));

    return () => {
      live = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (!reachable) return null;

  return (
    <div className="hub-spline" aria-hidden="true">
      <SplineBoundary>
        <SplineScene
          scene={CROSSROADS_SPLINE_SCENE}
          className="hub-spline-scene"
          {...(onReady ? { onReady } : {})}
        />
      </SplineBoundary>
    </div>
  );
}
