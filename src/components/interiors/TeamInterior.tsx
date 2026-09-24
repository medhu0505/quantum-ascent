import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Reveal } from "@/components/scene/Reveal";
import { Value } from "@/components/site/Bits";
import { getScene, isTodo, team } from "@/data/quantum";
import { Carousel360, type FanImage } from "@/components/ui/image-fan-carousel";

/**
 * Meet the Team: the crew wall.
 *
 * The frames are deliberately inert while the roster is unconfirmed. The
 * roles are real and worth showing — they are the fest's actual org chart —
 * but a frame that opens onto nothing is worse than a frame that plainly
 * says the name is still to come. Once the roster lands, each frame becomes
 * a hotspot onto a profile.
 */
/** Initials for an empty frame — of the name once there is one, of the role until then. */
function initials(text: string): string {
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TeamInterior() {
  const scene = getScene("team")!;
  const pending = team.filter((m) => isTodo(m.name)).length;

  // Captioned by role while the names are unconfirmed. Reading out
  // "TODO — name" eight times would be worse than simply naming the job.
  const roster: FanImage[] = team.map((member) => {
    const named = !isTodo(member.name);
    return {
      ...(member.photo ? { src: member.photo } : {}),
      alt: named ? `${member.name}, ${member.role}` : member.role,
      stand: initials(named ? member.name : member.role),
    };
  });

  return (
    <InteriorShell
      scene={scene}
      leadBelow
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

      <Carousel360 images={roster} />

      <h2 className="page-subhead">The full crew</h2>

      <ul className="frame-wall">
        {team.map((member, i) => (
          <Reveal as="li" key={member.role} delay={i}>
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
          </Reveal>
        ))}
      </ul>
    </InteriorShell>
  );
}
