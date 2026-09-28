import { MobileShell, ScreenHead } from "@/components/mobile/MobileShell";
import { crewCards } from "@/components/site/crew";
import { Carousel360 } from "@/components/ui/image-fan-carousel";
import { crew, getScene, listOf } from "@/data/quantum";

/**
 * Meet the Team on a phone. The deck is the desktop site's own: the ring of
 * cards you drag round, with the one at the front shown large. Under it, the
 * whole crew as a list, the way the brochure groups it: the teacher in charge,
 * each event's coordinators, and the organising teams.
 */

const ACCENTS = ["cyan", "magenta", "violet"] as const;

export function MobileTeam() {
  return (
    <MobileShell screen="team">
      <ScreenHead image={getScene("team")!.view!} title="Meet the Team" />

      <div className="m-deck">
        <Carousel360 images={crewCards} />
      </div>

      <div className="m-pad">
        <h2 className="m-h2 m-h2-lg">The full crew</h2>
        {crew.map((section) => (
          <section key={section.heading} className="m-crew-section">
            <h3 className="m-kicker m-crew-heading">{section.heading}</h3>
            <ul className="m-crew">
              {section.groups.map((group, i) => (
                <li key={group.role} data-accent={ACCENTS[i % ACCENTS.length]}>
                  <span className="m-crew-avatar" aria-hidden="true">
                    <span />
                  </span>
                  <span className="m-crew-text">
                    <span className="m-crew-role">{group.role}</span>
                    <span className="m-crew-name">{listOf(group.names)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="m-muted m-small m-closing">
          Quantum is student-run end to end. Students write the quiz, judge the prelims, cut the
          highlight reel, run the brackets and staff the help desk. Faculty coordinate and nothing
          more.
        </p>
      </div>
    </MobileShell>
  );
}
