/**
 * Ambient scene atmosphere: headlights crossing behind the signage, a drone
 * running the canyon.
 *
 * Every loop is a CSS keyframe rather than a video clip. These are interface
 * effects dressed as scene content, so a clip would cost bandwidth and sync
 * trouble for something a keyframe does deterministically and for free.
 * The whole layer is display:none under prefers-reduced-motion and in the
 * narrow layout, where the plate is only a backdrop.
 *
 * Positions are percentages of the film frame, placed against real fixtures
 * in the plate: the drone tracks the sky above the canyon, headlights cross
 * at the far junction.
 *
 * There was a third fixture, a failing sign: two magenta rectangles with a
 * flicker loop, sat on a pink panel in the plate the site used to carry.
 * That plate was replaced. Nothing in the new frame is under them, so they
 * were two hard-edged pink boxes hanging on a dark building — one above the
 * FAQ blade, one over the top of the Resources blade — going bright every
 * seven seconds. They dressed a fixture that no longer exists, so they are
 * gone rather than re-aimed: the new crossroads lights itself.
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient-pass" style={{ top: "62.5%" }} />
      <span className="ambient-pass" style={{ top: "60.1%", animationDelay: "7.5s" }} />
      <span className="ambient-drone" style={{ left: "78%", top: "18%" }} />
    </div>
  );
}
