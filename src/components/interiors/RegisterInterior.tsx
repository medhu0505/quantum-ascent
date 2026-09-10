import { Link } from "@tanstack/react-router";
import { InteriorShell } from "@/components/interiors/InteriorShell";
import { events, getScene } from "@/data/quantum";

/**
 * Register: one terminal, and it is the only thing in the room.
 *
 * Registration is the site's whole job, so this scene deliberately has a
 * single target. Everything else here is the information someone needs
 * before they commit — who can enter, what a team looks like, what happens
 * after — placed under the terminal rather than on a page they have to go
 * find first.
 */
export function RegisterInterior() {
  const scene = getScene("register")!;

  return (
    <InteriorShell
      scene={scene}
      lead="One form covers every event. Pick your school, name your team, choose what you are entering, and you are on the list."
    >
      <div className="console">
        <div className="console-readout" aria-hidden="true">
          <span className="console-dot" />
          <span>TERMINAL 01 — INTAKE</span>
        </div>
        <Link to="/register/form" className="console-face">
          <span className="console-kicker">Registration terminal</span>
          <span className="console-title">Open the entry form</span>
          <span className="console-sub">
            {events.length} events open · classes 9 to 12 · one form
          </span>
        </Link>
      </div>

      <section className="room-notes" aria-labelledby="before-you-register">
        <h2 id="before-you-register" className="room-subhead">
          Before you register
        </h2>
        <dl className="notes-grid">
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
      </section>
    </InteriorShell>
  );
}
