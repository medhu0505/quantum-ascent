import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Reveal } from "@/components/scene/Reveal";
import { crewCards } from "@/components/site/crew";
import { crew, getScene, listOf, teamClosing } from "@/data/quantum";
import { Carousel360 } from "@/components/ui/image-fan-carousel";

/**
 * Meet the Team: the crew wall.
 *
 * The brochure names the people running Quantum by what they run: the
 * teacher in charge, the student coordinators of each event, and the four
 * organising teams. Each of those is one card on the ring and one line on the
 * wall. Most people are named by first name only, so the wall does not dress
 * them up as frames of their own, and a group photo on a card is the only
 * step needed to put a picture on it.
 */
export function TeamInterior() {
  const scene = getScene("team")!;

  return (
    <InteriorShell scene={scene} leadBelow lead={teamClosing}>
      <Carousel360 images={crewCards} />

      <h2 className="page-subhead">The full crew</h2>

      {crew.map((section) => (
        <section key={section.heading} className="crew-section">
          <h3 className="crew-heading">{section.heading}</h3>
          <ul className="frame-wall">
            {section.groups.map((group, i) => (
              <Reveal as="li" key={group.role} delay={i}>
                <figure className="frame">
                  <div className="frame-plate" aria-hidden="true">
                    <span className="frame-initial" />
                  </div>
                  <figcaption>
                    <span className="frame-name">{listOf(group.names)}</span>
                    <span className="frame-role">{group.role}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </section>
      ))}
    </InteriorShell>
  );
}
