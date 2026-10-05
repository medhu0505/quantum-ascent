import { Reveal } from "@/components/scene/Reveal";
import { crewDirectory } from "@/components/site/crewDirectory";

/**
 * The detailed crew under Meet the Team's ring, on both layouts: a heading for
 * each team, then a portrait card for each person in it. One component, so a
 * phone gets the same cards on fewer columns rather than a different section.
 *
 * Every card has a slot of its own, the same shape whether it holds a picture
 * or the placeholder, so adding a picture later moves nothing.
 */
export function TeamDirectory() {
  return (
    <div className="dir">
      {/* The placeholder's figure, drawn once and used by every card. */}
      <svg className="dir-defs" aria-hidden="true" focusable="false">
        <symbol id="dir-person" viewBox="0 0 100 125">
          <circle cx="50" cy="46" r="17" />
          <path d="M16 125c0-26 14-41 34-41s34 15 34 41z" />
        </symbol>
      </svg>

      {crewDirectory.map((team) => (
        <Reveal as="section" key={team.id} className="dir-team" data-accent={team.accent}>
          <h3 className="dir-heading">
            {team.heading}
            {team.tag ? <span className="dir-tag">{team.tag}</span> : null}
          </h3>
          <ul className="dir-grid" role="list">
            {team.people.map((person) => (
              <li key={person.name}>
                <figure className="dir-card">
                  <div
                    className="dir-slot"
                    data-photo={person.photo ? "" : undefined}
                    aria-hidden="true"
                  >
                    {person.photo ? (
                      <img
                        src={person.photo}
                        alt=""
                        width={480}
                        height={600}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <svg className="dir-silhouette" focusable="false">
                        <use href="#dir-person" />
                      </svg>
                    )}
                  </div>
                  <figcaption className="dir-name">{person.name}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}
