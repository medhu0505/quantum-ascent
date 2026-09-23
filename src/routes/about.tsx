import { createFileRoute, Link } from "@tanstack/react-router";
import { Value } from "@/components/site/Bits";
import { PageShell } from "@/components/site/PageShell";
import { BROCHURE_URL, about, events, festFacts, isTodo, school } from "@/data/quantum";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    seo({
      title: "About",
      description: `Quantum is the student-run inter-school tech and culture fest at ${school.name}. Six events, one day, cumulative scoring across all of them.`,
      path: "/about",
    }),
  component: About,
});

function About() {
  return (
    <PageShell title="About Quantum" lede={about.lede}>
      <dl className="facts">
        {festFacts.map((fact) => (
          <div key={fact.label}>
            <dt className="sr-only">{fact.label}</dt>
            <dd>
              <span className="facts-value">{fact.value}</span>
              <span className="facts-label">{fact.label}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="prose-quantum measure">
        {about.body.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <p className="pull-quote">{about.kicker}</p>

      <section className="about-events" aria-labelledby="the-six">
        <h2 id="the-six" className="page-subhead">
          The six events
        </h2>
        <ul className="about-list">
          {events.map((event) => (
            <li key={event.id} data-accent={event.accent}>
              <Link to="/events" search={{ event: event.id }} className="about-list-link">
                <span className="about-list-name">{event.name}</span>
                <span className="about-list-note">{event.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="page-actions">
          <Link to="/register/form" className="btn btn-accent" data-magnetic>
            Register for the events
          </Link>
          <Link to="/events" className="btn btn-ghost" data-magnetic>
            Read the full event details
          </Link>
          {/* Only once there is something to download. A button pointing at
              the placeholder string would be a link that 404s, which is worse
              than no button — so until the URL is set this renders as the
              same "to be confirmed" badge every other unset value gets, and
              it becomes a real action the moment one exists. */}
          {isTodo(BROCHURE_URL) ? (
            <Value value={BROCHURE_URL} label="Brochure" />
          ) : (
            <a className="btn btn-ghost" href={BROCHURE_URL} download data-magnetic>
              Download the brochure
            </a>
          )}
        </div>
      </section>
    </PageShell>
  );
}
