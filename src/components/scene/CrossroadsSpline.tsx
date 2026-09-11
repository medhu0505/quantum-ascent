import { CROSSROADS_SPLINE_SCENE } from "@/data/quantum";
import { SplineScene } from "@/components/ui/splite";

/**
 * The Spline alternative to the native centrepiece.
 *
 * Renders nothing unless CROSSROADS_SPLINE_SCENE is set, in which case
 * `CrossroadsGL` stands its own core down and this takes the slot. It is
 * parked over the intersection in percentages of the stage rather than pixels,
 * so it tracks the plate through every viewport the stage is framed at.
 *
 * It composites on top of the street rather than standing in it — a separate
 * WebGL context has no access to the plate's depth buffer — so it cannot be
 * occluded by the road the way the native core is.
 */
export function CrossroadsSpline() {
  if (!CROSSROADS_SPLINE_SCENE) return null;

  return (
    <div className="hub-spline" aria-hidden="true">
      <SplineScene scene={CROSSROADS_SPLINE_SCENE} className="hub-spline-scene" />
    </div>
  );
}
