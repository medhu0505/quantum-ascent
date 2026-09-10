import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { about, events, school } from "@/data/quantum";
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
      <div className="prose-quantum measure">
        {about.body.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <section className="about-events" aria-labelledby="the-six">
        <h2 id="the-six" className="page-subhead">
          The six events
        </h2>
        <ul className="about-list">
          {events.map((event) => (
            <li key={event.id}>
              <span className="about-list-name">{event.name}</span>
              <span className="about-list-note">{event.tagline}</span>
            </li>
          ))}
        </ul>
        <Link to="/events" className="btn btn-ghost">
          Read the full event details
        </Link>
      </section>
    </PageShell>
  );
}
