import { Link } from "@tanstack/react-router";
import { InteriorShell } from "@/components/interiors/InteriorShell";
import { faqs, getScene } from "@/data/quantum";

/**
 * Resources: the archive wall.
 *
 * Three destinations, each a labelled link on the wall. They are ordinary
 * routes rather than scenes — someone reading the FAQ at 11pm the night
 * before the fest wants the answer, not another room to walk through.
 */
const links = [
  {
    to: "/faq",
    label: "FAQ",
    blurb: `${faqs.length} answers on entry, fees, scheduling and what to bring.`,
  },
  {
    to: "/about",
    label: "About",
    blurb: "What Quantum is, how it is scored, and who runs it.",
  },
  {
    to: "/contact",
    label: "Contact",
    blurb: "Reach the organising team before or during the fest.",
  },
] as const;

export function ResourcesInterior() {
  const scene = getScene("resources")!;

  return (
    <InteriorShell
      scene={scene}
      lead="Everything that is not an event or a form. Answers to the questions we get most, the background on the fest, and how to reach the people running it."
    >
      <ul className="archive-wall">
        {links.map((link, i) => (
          <li key={link.to}>
            <Link to={link.to} className="screen archive-link">
              <span className="archive-index">File {String(i + 1).padStart(2, "0")}</span>
              <span className="screen-title">{link.label}</span>
              <span className="screen-body">{link.blurb}</span>
              <span className="archive-go" aria-hidden="true">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </InteriorShell>
  );
}
