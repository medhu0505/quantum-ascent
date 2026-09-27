import { MobileShell, ScreenHead } from "@/components/mobile/MobileShell";
import { Value } from "@/components/site/Bits";
import { Carousel360, type FanImage } from "@/components/ui/image-fan-carousel";
import { getScene, isTodo, team } from "@/data/quantum";

/**
 * Meet the Team on a phone. The deck is the desktop site's own: the ring of
 * cards you drag round, with the one at the front shown large. Under it, the
 * whole crew as a list, each role with its name or, until the roster is
 * confirmed, a plain note that the name is still to come.
 */

/** Initials for an empty card: of the name once there is one, of the role until then. */
function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => word !== "&")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

const ACCENTS = ["cyan", "magenta", "violet"] as const;

export function MobileTeam() {
  const pending = team.filter((m) => isTodo(m.name)).length;

  const roster: FanImage[] = team.map((member) => {
    const named = !isTodo(member.name);
    return {
      ...(member.photo ? { src: member.photo } : {}),
      alt: named ? `${member.name}, ${member.role}` : member.role,
      stand: initials(named ? member.name : member.role),
    };
  });

  return (
    <MobileShell screen="team">
      <ScreenHead image={getScene("team")!.view!} title="Meet the Team" />

      <div className="m-pad">
        {pending > 0 ? (
          <p className="m-notice-row" role="status">
            <span className="todo">
              <span aria-hidden="true">⚠</span>
              {pending} of {team.length} names still to be confirmed
            </span>
          </p>
        ) : null}
      </div>

      <div className="m-deck">
        <Carousel360 images={roster} />
      </div>

      <div className="m-pad">
        <h2 className="m-h2 m-h2-lg">The full crew</h2>
        <ul className="m-crew">
          {team.map((member, i) => (
            <li key={member.role} data-accent={ACCENTS[i % ACCENTS.length]}>
              <span className="m-crew-avatar" aria-hidden="true">
                <span />
              </span>
              <span className="m-crew-text">
                <span className="m-crew-role">{member.role}</span>
                <span className="m-crew-name">
                  <Value value={member.name} label="Name" />
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="m-muted m-small m-closing">
          Quantum is student-run end to end. Students write the quiz, judge the prelims, cut the
          highlight reel, run the brackets and staff the help desk. Faculty coordinate and nothing
          more.
        </p>
      </div>
    </MobileShell>
  );
}
