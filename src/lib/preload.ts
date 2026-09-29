import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Loads the pages a phase-through can lead to once this page has settled,
 * and the pictures they open on.
 *
 * The picture of the old page is held until the next page has rendered, so
 * a page whose code is still downloading holds it longer: measured cold, the
 * crossroads sat still for over half a second before the zoom began.
 * Hovering a board already loads that one board's page; this covers the
 * keyboard, a quick click and a tap, which never hover.
 *
 * A room's photograph used to start downloading only once the room was on
 * screen, so it landed partway through the fade, or after it, and the room
 * came up empty and then filled in. Each one is fetched and decoded here
 * instead, and held, so the frame the room first draws already has it.
 */
export function usePreloadWhenIdle(paths: readonly string[], images: readonly string[] = []) {
  const router = useRouter();
  const key = paths.join("|");
  const pictures = images.join("|");

  useEffect(() => {
    const run = () => {
      for (const to of key.split("|")) {
        if (to) router.preloadRoute({ to }).catch(() => {});
      }
      for (const src of pictures.split("|")) {
        if (src) holdDecoded(src);
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1200);
    return () => window.clearTimeout(id);
  }, [router, key, pictures]);
}

/** Kept for the life of the page, so the browser keeps them ready to draw. */
const held = new Map<string, HTMLImageElement>();

function holdDecoded(src: string) {
  if (held.has(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  held.set(src, img);
  img.decode().catch(() => {});
}
