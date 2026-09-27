import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Loads the pages a phase-through can lead to once this page has settled.
 *
 * The picture of the old page is held until the next page has rendered, so
 * a page whose code is still downloading holds it longer: measured cold, the
 * crossroads sat still for over half a second before the zoom began.
 * Hovering a board already loads that one board's page; this covers the
 * keyboard, a quick click and a tap, which never hover.
 */
export function usePreloadWhenIdle(paths: readonly string[]) {
  const router = useRouter();
  const key = paths.join("|");

  useEffect(() => {
    const run = () => {
      for (const to of key.split("|")) {
        if (to) router.preloadRoute({ to }).catch(() => {});
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1200);
    return () => window.clearTimeout(id);
  }, [router, key]);
}
