/**
 * Ambient scene atmosphere: a failing sign across the junction, headlights
 * crossing behind the signage, a drone running the canyon.
 *
 * Every loop is a CSS keyframe rather than a video clip. These are interface
 * effects dressed as scene content, so a clip would cost bandwidth and sync
 * trouble for something a keyframe does deterministically and for free.
 * The whole layer is display:none under prefers-reduced-motion and in the
 * narrow layout, where the plate is only a backdrop.
 *
 * Positions are percentages of the film frame, placed against real fixtures
 * in the plate: the sign sits on the pink panel left of centre, the drone
 * tracks the sky above the canyon, headlights cross at the far junction.
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span
        className="ambient-flicker"
        style={{ left: "31.1%", top: "22.6%", width: "4.2%", height: "19.9%" }}
      />
      <span
        className="ambient-flicker"
        style={{ left: "62.1%", top: "34.7%", width: "2%", height: "9.7%", animationDelay: "3.4s" }}
      />
      <span className="ambient-pass" style={{ top: "62.5%" }} />
      <span className="ambient-pass" style={{ top: "60.1%", animationDelay: "7.5s" }} />
      <span className="ambient-drone" style={{ left: "78%", top: "18%" }} />
    </div>
  );
}
