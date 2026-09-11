import { Suspense, lazy, useEffect, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

/**
 * A Spline scene, mounted client-side only.
 *
 * Spline's runtime builds its own WebGL context and reaches out to
 * prod.spline.design for the scene file at render time, so it cannot be
 * server-rendered and it cannot draw anything without the network. Both of
 * those matter here: the crossroads centrepiece is drawn natively in
 * `CrossroadsGL` instead, inside the composer that already lights the scene,
 * and this path exists for a scene of your own — see CROSSROADS_SPLINE_SCENE
 * in src/data/quantum.ts.
 */
export function SplineScene({ scene, className }: { scene: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
