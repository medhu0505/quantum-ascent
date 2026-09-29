import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, MessagesSquare, Phone } from "lucide-react";
import { useState } from "react";
import { Value } from "@/components/site/Bits";
import {
  BROCHURE_URL,
  FEST_DATES,
  about,
  contact,
  contactPage,
  eventDay,
  events,
  faqs,
  festFacts,
  isTodo,
  onTheDay,
  resourceHints,
  school,
  updateChannels,
} from "@/data/quantum";
import { faqJsonLd } from "@/lib/structured-data";
import { telHref } from "@/lib/utils";

/**
 * The three tabs of Resources as the desk shows them, under the folded room.
 *
 * The phone app shows the same sections in the same order, from the same
 * data, in src/components/mobile/MobileResources.tsx. A section added to one
 * belongs in the other.
 *
 * A link from one tab to another replaces the address rather than adding to
 * the history, the same as choosing a monitor: Back leaves Resources instead
 * of walking back through every tab that was opened.
 */

/**
 * FAQ. Collapsed by default, and one open at a time is not enforced: people
 * comparing two answers should be able to hold both open.
 *
 * Also emitted as FAQPage structured data, because these are the queries
 * that actually bring people to a fest site from search.
 */
export function FaqPanel() {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      <ul className="faq">
        {faqs.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <li key={item.q} className="faq-item">
              <h2>
                <button
                  type="button"
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span>{item.q}</span>
                  <span className="faq-mark" aria-hidden="true" />
                </button>
              </h2>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                className="faq-panel"
                data-open={isOpen || undefined}
                inert={!isOpen || undefined}
              >
                <div className="faq-panel-inner">
                  <p>{item.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="faq-more" aria-labelledby="faq-more">
        <h2 id="faq-more" className="page-subhead">
          Still stuck?
        </h2>
        <p className="channel-note measure">{resourceHints.notAnswered}</p>
        <div className="page-actions">
          <Link to="/contact" replace className="btn btn-ghost" data-magnetic>
            See the event contacts
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
    </>
  );
}

export function AboutPanel() {
  return (
    <>
      <dl className="facts">
        {festFacts.map((fact) => (
          <div key={fact.label}>
            <dt className="sr-only">{fact.label}</dt>
            <dd>
              <span className="facts-value">{fact.value}</span>
              <span className="facts-label">{fact.label}</span>
              <span className="facts-note">{fact.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="about-intro">
        <h2 id="about-intro" className="page-subhead">
          {about.intro.heading}
        </h2>
        <div className="prose-quantum measure">
          {about.intro.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="about-events" aria-labelledby="about-scoring">
        <h2 id="about-scoring" className="page-subhead">
          {about.scoring.heading}
        </h2>
        <p className="pull-quote about-scoring-line">{about.scoring.line}</p>
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
          <Link to="/register" className="btn btn-accent" data-magnetic>
            Register for the events
          </Link>
          <Link to="/events" className="btn btn-ghost" data-magnetic>
            Read the full event details
          </Link>
          {/* Only once there is something to download. A button pointing at
              the placeholder string would be a link that 404s, which is worse
              than no button, so until the URL is set this renders as the
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
    </>
  );
}

const CHANNEL_ICONS = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  discord: MessagesSquare,
} as const;

/**
 * Contact: the people to call about each event, the teacher in charge for
 * anything else, then where the fest posts its updates, then where and when
 * it happens.
 *
 * The event in-charges are the fest's public contacts, one card per event
 * with the numbers the brochure prints for them. The teacher in charge gets a
 * card of the same kind under General inquiries. Her email is not published
 * anywhere on the site.
 */
export function ContactPanel() {
  return (
    <>
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
                    <a href={telHref(person.phone)}>{person.phone}</a>
                  </li>
                ))}
              </ul>
              <p className="channel-note">{eventDay(event)}</p>
            </li>
          ))}
        </ul>
        <p className="channel-note measure contact-faculty">{contactPage.faculty}</p>
      </section>

      <section aria-labelledby="general-inquiries">
        <h2 id="general-inquiries" className="page-subhead">
          {contactPage.general.heading}
        </h2>
        <ul className="channels">
          <li className="contact-event" data-accent="violet">
            <div className="channel-head">
              <Phone className="channel-icon" aria-hidden="true" strokeWidth={1.75} />
              <h3 className="channel-label">{contact.role}</h3>
            </div>
            <ul className="contact-people">
              <li>
                <span className="contact-person">{contactPage.general.name}</span>
                <a href={telHref(contact.phone)}>{contact.phone}</a>
              </li>
            </ul>
            <p className="channel-note">{contactPage.general.note}</p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="updates" className="contact-updates">
        <h2 id="updates" className="page-subhead">
          Updates
        </h2>
        <ul className="channels">
          {updateChannels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.id];
            return (
              <li key={channel.id}>
                <div className="channel-head">
                  <Icon className="channel-icon" aria-hidden="true" strokeWidth={1.75} />
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
            );
          })}
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
        <p className="channel-note measure">{onTheDay}</p>
      </section>

      <section className="venue" aria-labelledby="before-contact">
        <h2 id="before-contact" className="page-subhead">
          Before you call
        </h2>
        <p className="channel-note measure">{resourceHints.beforeYouCall}</p>
        <div className="page-actions">
          <Link to="/faq" replace className="btn btn-ghost" data-magnetic>
            Read the FAQ
          </Link>
          <Link to="/register" className="btn btn-accent" data-magnetic>
            Register for the events
          </Link>
        </div>
      </section>
    </>
  );
}
