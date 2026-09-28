import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, MessagesSquare, Phone } from "lucide-react";
import { MobileResources } from "@/components/mobile/MobileResources";
import { PageShell } from "@/components/site/PageShell";
import { FEST_DATES, FEST_DAYS, contact, eventDay, events, school } from "@/data/quantum";
import { useLayout } from "@/lib/motion";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      title: "Contact",
      description: `Who to call about each Quantum V2.0 event, and where to follow the fest, at ${school.name}, ${school.city}.`,
      path: "/contact",
    }),
  component: ContactRoute,
});

function ContactRoute() {
  return useLayout() === "desk" ? <Contact /> : <MobileResources tab="contact" />;
}

/** The number as the brochure prints it on the page; the link dials the digits. */
const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

const channels = [
  {
    label: "Instagram",
    who: undefined,
    icon: Instagram,
    value: contact.instagram,
    href: contact.instagramUrl,
    note: "Announcements, results and the highlight reel.",
  },
  {
    label: "WhatsApp",
    who: "community",
    icon: MessageCircle,
    value: "Join the community",
    href: contact.whatsappUrl,
    note: "Live updates through both fest days, and news about the events you are in.",
  },
  {
    label: "Discord",
    who: "server",
    icon: MessagesSquare,
    value: "Join the server",
    href: contact.discordUrl,
    note: "Updates about your own events, alongside the WhatsApp community.",
  },
];

/**
 * Contact: the people to call about each event, then where the fest posts
 * its updates.
 *
 * The event in-charges are the fest's public contacts, one card per event
 * with the numbers the brochure prints for them. The teacher in charge is
 * named here but not numbered: her own email and phone are not published
 * anywhere on the site.
 */
function Contact() {
  return (
    <PageShell
      ledeBelow
      title="Contact"
      lede="Questions about an event go to its student in-charges, whose numbers are on this page. For live updates through both fest days, follow the WhatsApp community, Discord or Instagram."
    >
      <section aria-labelledby="event-contacts">
        <h2 id="event-contacts" className="page-subhead">
          Event contacts
        </h2>
        <ul className="channels">
          {events.map((event) => (
            <li key={event.id} className="contact-event" data-accent={event.accent}>
              <div className="channel-head">
                <Phone className="channel-icon" aria-hidden="true" strokeWidth={1.75} />
                <h3 className="channel-label">{event.name}</h3>
              </div>
              <ul className="contact-people">
                {event.coordinators.map((person) => (
                  <li key={person.name}>
                    <span className="contact-person">{person.name}</span>
                    <a href={tel(person.phone)}>{person.phone}</a>
                  </li>
                ))}
              </ul>
              <p className="channel-note">{eventDay(event)}</p>
            </li>
          ))}
        </ul>
        <p className="channel-note measure contact-faculty">
          The fest&apos;s teacher in charge is {contact.name}. For anything about a particular
          event, its in-charges are the people to call.
        </p>
      </section>

      <section aria-labelledby="updates" className="contact-updates">
        <h2 id="updates" className="page-subhead">
          Updates
        </h2>
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
                <a href={channel.href} target="_blank" rel="noreferrer">
                  {channel.value}
                </a>
              </p>
              <p className="channel-note">{channel.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="venue" aria-labelledby="venue-heading">
        <h2 id="venue-heading" className="page-subhead">
          Where it happens
        </h2>
        <address className="venue-address">
          {school.name}
          <br />
          {school.city}
        </address>
        <p className="venue-when">
          <span className="venue-when-label">When</span>
          {FEST_DATES}
        </p>
        <p className="channel-note measure">
          On {FEST_DAYS.offline.label}, be at the school by 7:30 a.m.: the registration desk is open
          from 7:30 to 8:00 a.m. Bring your confirmation email, and come in school uniform with your
          teacher in-charge.
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
          <Link to="/register" className="btn btn-accent" data-magnetic>
            Register for the events
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
