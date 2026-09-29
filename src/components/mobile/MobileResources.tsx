import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { MobileShell, ScreenHead, ScreenLink } from "@/components/mobile/MobileShell";
import { Value } from "@/components/site/Bits";
import {
  BROCHURE_URL,
  FEST_DATES,
  about,
  contact,
  contactPage,
  eventDay,
  events,
  faqPage,
  faqs,
  festFacts,
  getScene,
  isTodo,
  onTheDay,
  resourceHints,
  resourceTabs,
  school,
  updateChannels,
  type ResourceTab,
} from "@/data/quantum";
import { faqJsonLd } from "@/lib/structured-data";

/**
 * Resources on a phone: the FAQ, About and Contact as three tabs of one
 * screen. Each tab is its own address, the same /faq, /about and /contact the
 * desk answers on a wide screen, so a link to one opens on it and the tab
 * survives a reload. Switching tabs replaces the address rather than pushing,
 * and keeps the scroll where it is.
 *
 * The desk shows the same sections in the same order, from the same data, in
 * src/components/interiors/ResourcesPanels.tsx. A section added to one
 * belongs in the other.
 */

function Faq() {
  const [open, setOpen] = useState(0);
  const base = useId();

  return (
    <>
      <h2 className="m-h2 m-h2-lg m-tab-head">{faqPage.title}</h2>
      <p className="m-muted m-small m-tab-lede">{faqPage.tagline}</p>
      <div className="m-faq">
        {faqs.map((item, i) => {
          const on = open === i;
          const panel = `${base}-a-${i}`;
          return (
            <div key={item.q} className="m-faq-item" data-open={on || undefined}>
              <h3 className="m-faq-q">
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={panel}
                  onClick={() => setOpen(on ? -1 : i)}
                >
                  <span>{item.q}</span>
                  <span className="m-faq-sign" aria-hidden="true">
                    {on ? "−" : "+"}
                  </span>
                </button>
              </h3>
              <p id={panel} className="m-faq-a" hidden={!on}>
                {item.a}
              </p>
            </div>
          );
        })}
      </div>

      <h3 className="m-h3">Still stuck?</h3>
      <p className="m-muted m-prose">{resourceHints.notAnswered}</p>
      <div className="m-res-actions">
        <Link to="/contact" replace className="m-btn m-btn-ghost">
          See the event contacts
        </Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
    </>
  );
}

function About() {
  return (
    <>
      <h2 className="m-h2 m-h2-lg m-tab-head">{about.title}</h2>
      <p className="m-muted m-small m-tab-lede">{about.tagline}</p>
      <dl className="m-facts">
        {festFacts.map((fact) => (
          <div key={fact.label}>
            <dt className="sr-only">{fact.label}</dt>
            <dd>
              <span className="m-fact-value m-gradient-text">{fact.value}</span>
              <span className="m-fact-label">{fact.label}</span>
              <span className="m-fact-note">{fact.note}</span>
            </dd>
          </div>
        ))}
      </dl>
      <h3 className="m-h3">{about.intro.heading}</h3>
      {about.intro.body.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="m-muted m-prose">
          {paragraph}
        </p>
      ))}
      <h3 className="m-h3">{about.scoring.heading}</h3>
      <p className="m-muted m-prose">{about.scoring.line}</p>
      <ul className="m-res-events">
        {events.map((event) => (
          <li key={event.id} data-accent={event.accent}>
            <ScreenLink to="/events" search={{ event: event.id }}>
              <span className="m-res-event-name">{event.name}</span>
              <span className="m-res-event-note">{event.tagline}</span>
            </ScreenLink>
          </li>
        ))}
      </ul>
      <div className="m-res-actions">
        <ScreenLink to="/register" className="m-btn m-btn-accent" data-accent="magenta">
          Register for the events
        </ScreenLink>
        <ScreenLink to="/events" className="m-btn m-btn-ghost">
          Read the full event details
        </ScreenLink>
        {isTodo(BROCHURE_URL) ? (
          <p className="m-brochure">
            <Value value={BROCHURE_URL} label="Brochure" />
          </p>
        ) : (
          <a className="m-btn m-btn-ghost" href={BROCHURE_URL} download>
            Download the brochure
          </a>
        )}
      </div>
    </>
  );
}

/** The number as the brochure prints it on the page; the link dials the digits. */
const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

/**
 * The event in-charges are the fest's public contacts, so they lead the tab.
 * The teacher in charge follows under General inquiries, in a card of the
 * same kind. Her email is not published anywhere on the site.
 */
function Contact() {
  return (
    <>
      <h2 className="m-h2 m-h2-lg m-tab-head">{contactPage.title}</h2>
      <p className="m-muted m-small m-tab-lede">{contactPage.lede}</p>
      <div className="m-contact">
        <p className="m-contact-who">
          <span className="m-contact-name">Event contacts</span>
          <span className="m-contact-role">
            Call the in-charges of the event you are asking about.
          </span>
        </p>
        <dl className="m-contact-events">
          {events.map((event) => (
            <div key={event.id} data-accent={event.accent}>
              <dt>{event.name}</dt>
              {event.coordinators.map((person) => (
                <dd key={person.name}>
                  <span>{person.name}</span>
                  <a href={tel(person.phone)}>{person.phone}</a>
                </dd>
              ))}
              <dd className="m-contact-day">{eventDay(event)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="m-muted m-small m-contact-faculty">{contactPage.faculty}</p>

      <div className="m-contact m-contact-general">
        <p className="m-contact-who">
          <span className="m-contact-name">{contactPage.general.heading}</span>
          <span className="m-contact-role">{contactPage.general.note}</span>
        </p>
        <dl className="m-contact-events">
          <div data-accent="violet">
            <dt>{contact.role}</dt>
            <dd>
              <span>{contactPage.general.name}</span>
              <a href={tel(contact.phone)}>{contact.phone}</a>
            </dd>
          </div>
        </dl>
      </div>

      <h3 className="m-h3">Updates</h3>
      <dl className="m-details">
        {updateChannels.map((channel) => (
          <div key={channel.id}>
            <dt>{channel.label}</dt>
            <dd>
              <a href={channel.href} target="_blank" rel="noreferrer">
                {channel.value}
              </a>
              <span className="m-detail-note">{channel.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="m-h3">Where it happens</h3>
      <dl className="m-details">
        <div>
          <dt>Venue</dt>
          <dd>
            {school.name}
            <br />
            {school.city}
          </dd>
        </div>
        <div>
          <dt>Dates</dt>
          <dd>{FEST_DATES}</dd>
        </div>
        <div>
          <dt>On the day</dt>
          <dd>{onTheDay}</dd>
        </div>
      </dl>

      <h3 className="m-h3">Before you call</h3>
      <p className="m-muted m-prose">{resourceHints.beforeYouCall}</p>
      <div className="m-res-actions">
        <Link to="/faq" replace className="m-btn m-btn-ghost">
          Read the FAQ
        </Link>
        <ScreenLink to="/register" className="m-btn m-btn-accent" data-accent="magenta">
          Register for the events
        </ScreenLink>
      </div>
    </>
  );
}

export function MobileResources({ tab }: { tab: ResourceTab }) {
  return (
    <MobileShell screen="resources">
      <ScreenHead image={getScene("resources")!.view!} title="Resources" accent="violet" />
      <div className="m-pad m-resources">
        <nav className="m-tabs" aria-label="Resources">
          {resourceTabs.map((t) => (
            <Link
              key={t.id}
              to={t.to}
              replace
              resetScroll={false}
              className="m-tab"
              aria-current={t.id === tab ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {tab === "faq" ? <Faq /> : tab === "about" ? <About /> : <Contact />}
      </div>
    </MobileShell>
  );
}
