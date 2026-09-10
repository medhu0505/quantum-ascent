import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { Value } from "@/components/site/Bits";
import { contact, isTodo, school } from "@/data/quantum";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      title: "Contact",
      description: `Reach the Quantum V2.0 organising team at ${school.name}, ${school.city}.`,
      path: "/contact",
    }),
  component: Contact,
});

const channels = [
  {
    label: "Email",
    value: contact.email,
    href: (v: string) => `mailto:${v}`,
    note: "Best for anything that needs a written answer: entry queries, schedule clashes, accessibility requirements.",
  },
  {
    label: "Phone",
    value: contact.phone,
    href: (v: string) => `tel:${v.replace(/\s/g, "")}`,
    note: "For the day itself — running late, finding the venue, or anything urgent once the fest has started.",
  },
  {
    label: "Instagram",
    value: contact.instagram,
    href: (v: string) => `https://instagram.com/${v.replace(/^@/, "")}`,
    note: "Announcements, results and the highlight reel.",
  },
];

function Contact() {
  return (
    <PageShell
      title="Contact"
      lede="Questions about entry, scheduling, or anything on the day go to the organising team. It is students who answer, so give us a little time outside school hours."
    >
      <ul className="channels">
        {channels.map((channel) => (
          <li key={channel.label}>
            <p className="channel-label">{channel.label}</p>
            <p className="channel-value">
              {isTodo(channel.value) ? (
                <Value value={channel.value} label={channel.label} />
              ) : (
                <a href={channel.href(channel.value)}>{channel.value}</a>
              )}
            </p>
            <p className="channel-note">{channel.note}</p>
          </li>
        ))}
      </ul>

      <section className="venue" aria-labelledby="venue-heading">
        <h2 id="venue-heading" className="page-subhead">
          Where it happens
        </h2>
        <address className="venue-address">
          {school.name}
          <br />
          {school.city}
        </address>
        <p className="channel-note measure">
          Report to the main reception with your school ID and your confirmation email. Team codes
          are checked at the desk before any event starts.
        </p>
      </section>

      <section className="venue" aria-labelledby="before-contact">
        <h2 id="before-contact" className="page-subhead">
          Before you write
        </h2>
        <p className="channel-note measure">
          Most questions we get are already answered on the FAQ — who can enter, whether you can do
          more than one event, fees, and what to bring.
        </p>
        <div className="page-actions">
          <Link to="/faq" className="btn btn-ghost">
            Read the FAQ
          </Link>
          <Link to="/register/form" className="btn btn-accent">
            Register your school
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
