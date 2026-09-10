import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Value } from "@/components/site/Bits";
import { getScene, isTodo, team } from "@/data/quantum";

/**
 * Meet the Team: the crew wall.
 *
 * The frames are deliberately inert while the roster is unconfirmed. The
 * roles are real and worth showing — they are the fest's actual org chart —
 * but a frame that opens onto nothing is worse than a frame that plainly
 * says the name is still to come. Once the roster lands, each frame becomes
 * a hotspot onto a profile.
 */
export function TeamInterior() {
  const scene = getScene("team")!;
  const pending = team.filter((m) => isTodo(m.name)).length;

  return (
    <InteriorShell
      scene={scene}
      lead="Quantum is student-run end to end. Students write the quiz, judge the prelims, cut the highlight reel, run the brackets and staff the help desk. Faculty coordinate and nothing more."
    >
      {pending > 0 ? (
        <p className="room-notice" role="status">
          <span className="todo">
            <span aria-hidden="true">⚠</span>
            {pending} of {team.length} names still to be confirmed
          </span>
        </p>
      ) : null}

      <ul className="frame-wall">
        {team.map((member) => (
          <li key={member.role}>
            <figure className="frame">
              <div className="frame-plate" aria-hidden="true">
                <span className="frame-initial" />
              </div>
              <figcaption>
                <span className="frame-name">
                  <Value value={member.name} label="Name" />
                </span>
                <span className="frame-role">{member.role}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </InteriorShell>
  );
}
