import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, Mail, Phone } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { Value } from "@/components/site/Bits";
import { FEST_DATES, contact, isTodo, school } from "@/data/quantum";
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
    who: `${contact.name}, ${contact.role.toLowerCase()}`,
    icon: Mail,
    value: contact.email,
    href: (v: string) => `mailto:${v}`,
    note: "Best for anything that needs a written answer: entry queries, schedule clashes, accessibility requirements.",
  },
  {
    label: "Phone",
    who: `${contact.name}, ${contact.role.toLowerCase()}`,
    icon: Phone,
    value: contact.phone,
    href: (v: string) => `tel:${v.replace(/\s/g, "")}`,
    note: "For the fest days themselves: running late or finding the venue on the offline day, or anything urgent once the fest has started.",
  },
  {
    label: "Instagram",
    who: undefined,
    icon: Instagram,
    value: contact.instagram,
    href: (v: string) => `https://instagram.com/${v.replace(/^@/, "")}`,
    note: "Announcements, results and the highlight reel.",
  },
];

function Contact() {
  return (
    <PageShell
      ledeBelow
      title="Contact"
      lede="Questions about entry, scheduling, or anything on either fest day go to the teacher in charge. Please allow a little time for a reply outside school hours."
    >
      <ul className="channels">
        {channels.map((channel) => (
          <li key={channel.label}>
            <div className="channel-head">
              <channel.icon className="channel-icon" aria-hidden="true" strokeWidth={1.75} />
              <p className="channel-label">
                {channel.label}
                {channel.who ? <span className="channel-who"> · {channel.who}</span> : null}
              </p>
            </div>
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
        {/* The dates were a constant nothing rendered — set in quantum.ts,
            read only by the JSON-LD for search engines, and invisible to the
            visitor standing in front of the page asking when this is. Badged
            like every other unconfirmed value, so it looks missing until it
            is set rather than quietly absent. */}
        <p className="venue-when">
          <span className="venue-when-label">When</span>
          <Value value={FEST_DATES} label="Dates" />
        </p>
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
          Most questions we get are already answered on the FAQ — who can enter, how entries are
          submitted, fees, and what you need to prepare.
        </p>
        <div className="page-actions">
          <Link to="/faq" className="btn btn-ghost" data-magnetic>
            Read the FAQ
          </Link>
          <Link to="/register/form" className="btn btn-accent" data-magnetic>
            Register for the events
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
