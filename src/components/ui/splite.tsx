import { Suspense, lazy, useEffect, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

/**
 * A Spline scene, mounted client-side only.
 *
 * Spline builds its own WebGL context and fetches the scene from
 * prod.spline.design at render time, so it cannot be server-rendered and it
 * draws nothing without the network. `onReady` fires once the scene is
 * actually up, which is what lets the caller hold whatever it is replacing in
 * place until then rather than clearing the slot and hoping.
 */
export function SplineScene({
  scene,
  className,
  onReady,
}: {
  scene: string;
  className?: string;
  onReady?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <Spline scene={scene} className={className} onLoad={() => onReady?.()} />
    </Suspense>
  );
}
