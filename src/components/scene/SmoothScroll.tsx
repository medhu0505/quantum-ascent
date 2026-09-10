import Lenis from "lenis";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Inertial scrolling.
 *
 * A native wheel event moves the page in hard, quantised jumps — typically
 * ~100px per notch — so anything driven by scroll position advances in the
 * same steps. That is what makes a scroll-driven scene feel choppy no matter
 * how good the scene is: the input is a staircase.
 *
 * Lenis intercepts the wheel and interpolates real scroll position toward the
 * target every frame, so scrollY becomes continuous. The descent scrub, the
 * beam, and every reveal read from that same position and inherit the
 * smoothing for free — nothing else has to know this exists.
 *
 * It is switched off entirely under prefers-reduced-motion, where hijacking
 * the scroll would be exactly the wrong thing to do.
 */

const LenisContext = createContext<Lenis | null>(null);

/** For anything that needs to move the page and have the scene follow. */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const instance = new Lenis({
      // Long enough to feel weighted, short enough that the hub still arrives
      // when you ask for it. The easing is the same expo-out curve the rest of
      // the site moves on, so scrolling and animation share one hand.
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
      // Touch devices already have inertial scrolling in hardware; adding a
      // second layer on top makes them feel laggy and breaks momentum.
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
    });

    const loop = (time: number) => {
      instance.raf(time);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    setLenis(instance);

    return () => {
      cancelAnimationFrame(raf.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
