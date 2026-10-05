import { MobileShell, ScreenHead } from "@/components/mobile/MobileShell";
import { crewCards, crewWall } from "@/components/site/crew";
import { Carousel360 } from "@/components/ui/image-fan-carousel";
import { getScene, teamClosing } from "@/data/quantum";

/**
 * Meet the Team on a phone. The deck is the desktop site's own: the ring of
 * cards you drag round, with the one at the front shown large. Under it, the
 * whole crew as a list, a row for each person, under the heading the brochure
 * gives them: the teacher in charge, the event coordinators, and the
 * organising teams.
 */

export function MobileTeam() {
  return (
    <MobileShell screen="team">
      <ScreenHead image={getScene("team")!.view!} title="Meet the Team" />

      <div className="m-deck">
        <Carousel360 images={crewCards} />
      </div>

      <div className="m-pad">
        <h2 className="m-h2 m-h2-lg">The full crew</h2>
        {crewWall.map((section) => (
          <section key={section.heading} className="m-crew-section">
            <h3 className="m-kicker m-crew-heading">{section.heading}</h3>
            <ul className="m-crew">
              {section.people.map((person) => (
                <li key={person.name} data-accent={person.accent}>
                  <span className="m-crew-avatar" aria-hidden="true">
                    {person.photo ? (
                      <img src={person.photo} alt="" width={88} height={88} loading="lazy" />
                    ) : (
                      <span />
                    )}
                  </span>
                  <span className="m-crew-text">
                    <span className="m-crew-name">{person.name}</span>
                    <span className="m-crew-role">{person.role}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="m-muted m-small m-closing">{teamClosing}</p>
      </div>
    </MobileShell>
  );
}
