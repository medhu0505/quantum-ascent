import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Reveal } from "@/components/scene/Reveal";
import { crewCards, crewWall } from "@/components/site/crew";
import { getScene, teamClosing } from "@/data/quantum";
import { Carousel360 } from "@/components/ui/image-fan-carousel";

/**
 * Meet the Team: the crew wall.
 *
 * The brochure names the people running Quantum by what they run: the
 * teacher in charge, the student coordinators of each event, and the four
 * organising teams. Each person is one card on the ring and one frame on the
 * wall, under the heading for what they do. A frame holds their picture, or a
 * silhouette until there is one.
 */
export function TeamInterior() {
  const scene = getScene("team")!;

  return (
    <InteriorShell scene={scene} leadBelow lead={teamClosing}>
      <Carousel360 images={crewCards} />

      <h2 className="page-subhead">The full crew</h2>

      {crewWall.map((section) => (
        <section key={section.heading} className="crew-section">
          <h3 className="crew-heading">{section.heading}</h3>
          <ul className="frame-wall">
            {section.people.map((person, i) => (
              <Reveal as="li" key={person.name} delay={i % 4}>
                <figure className="frame">
                  <div className="frame-plate" aria-hidden="true">
                    {person.photo ? (
                      <img src={person.photo} alt="" width={88} height={88} loading="lazy" />
                    ) : (
                      <span className="frame-initial" />
                    )}
                  </div>
                  <figcaption>
                    <span className="frame-name">{person.name}</span>
                    <span className="frame-role">{person.role}</span>
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
