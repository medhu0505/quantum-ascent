/**
 * A one-line channel between a signboard being clicked and the WebGL camera.
 *
 * The two live in different trees — the sign is a router link inside the hub,
 * the camera is inside CrossroadsGL — and the GL layer is often not mounted at
 * all (no WebGL, coarse pointer, reduced motion). An event means the sign can
 * announce the entry without knowing or caring whether anything is listening,
 * and nothing has to be threaded through the router.
 */

export const ENTER_EVENT = "quantum:enter";

export type EnterDetail = { id: string };

/** Announce that the visitor is entering the building behind this sign. */
export function announceEnter(id: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EnterDetail>(ENTER_EVENT, { detail: { id } }));
}
