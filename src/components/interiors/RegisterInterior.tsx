import { Link } from "@tanstack/react-router";
import { ExitToCrossroads } from "@/components/site/Bits";
import { Reveal } from "@/components/scene/Reveal";
import { events, getScene } from "@/data/quantum";

/**
 * Register: the desk, and the centre monitor is the door.
 *
 * This was a terminal card floating over a small window photo, with the copy
 * doing all the work of saying "this is where you register." The desk is now
 * the whole page — the same room-is-the-page treatment as Resources — and the
 * one screen with nothing on it is the button, because a screen with nothing
 * on it is exactly what a form waiting to be opened should look like. The two
 * side monitors are dressing, not controls: they are part of the photograph,
 * not part of the interface, so nothing is hung on them.
 *
 * Registration is the site's whole job, so what someone needs to decide
 * before they click still sits under the desk rather than on a page they
 * have to go find first.
 */
export function RegisterInterior() {
  const scene = getScene("register")!;

  return (
    <>
      <ExitToCrossroads />

      <main id="main" className="desk">
        {/* The room carries no visible heading of its own — the photograph is
            the identity — so this is what a screen reader announces instead. */}
        <h1 className="sr-only">{scene.label}</h1>
        <p className="sr-only">
          One form covers every event. Pick your school, name your team, choose what you are
          entering, and you are on the list.
        </p>

        <div className="desk-frame">
          <div className="desk-room">
            <img
              className="desk-plate"
              src={scene.view}
              alt=""
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <ul className="desk-screens">
            <li style={{ left: "33.36%", top: "26.3%", width: "24.93%", height: "19.66%" }}>
              <Link to="/register/form" className="desk-screen" data-cursor-label="Open">
                <span className="desk-screen-label">Register</span>
                <span className="sr-only">
                  . Open the entry form — {events.length} events open.
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </main>

      <Reveal as="section" className="room-notes desk-notes" aria-labelledby="before-you-register">
        <h2 id="before-you-register" className="room-subhead">
          Before you register
        </h2>
        <dl className="notes-grid" data-accent={scene.accent}>
          <div>
            <dt>Who can enter</dt>
            <dd>
              Students in classes 9 to 12 at any participating school. A school may send more than
              one team to the same event.
            </dd>
          </div>
          <div>
            <dt>Team sizes</dt>
            <dd>
              They differ by event, from solo entries to teams of five. Each event lists its own on
              the Events screens.
            </dd>
          </div>
          <div>
            <dt>Multiple events</dt>
            <dd>
              Enter as many as you can physically attend. Check the schedule first — rounds can run
              at the same time and we cannot hold one for a late team.
            </dd>
          </div>
          <div>
            <dt>After you submit</dt>
            <dd>
              You get a confirmation email with your team code, reporting times and the campus map.
              Bring the team code; it is how we check you in.
            </dd>
          </div>
        </dl>
      </Reveal>
    </>
  );
}
