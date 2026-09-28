import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { MobileShell, ScreenHead } from "@/components/mobile/MobileShell";
import { Value } from "@/components/site/Bits";
import {
  BROCHURE_URL,
  FEST_DATES,
  FEST_DAYS,
  about,
  contact,
  events,
  faqPage,
  faqs,
  festFacts,
  getScene,
  isTodo,
  school,
} from "@/data/quantum";
import { faqJsonLd } from "@/lib/structured-data";

/**
 * Resources on a phone: the FAQ, About and Contact as three tabs of one
 * screen. Each tab is its own address, the same /faq, /about and /contact the
 * desktop site answers, so a link to one opens on it and the tab survives a
 * reload. Switching tabs replaces the address rather than pushing, and keeps
 * the scroll where it is.
 */

export type ResourceTab = "faq" | "about" | "contact";

const TABS: { tab: ResourceTab; to: string; label: string }[] = [
  { tab: "faq", to: "/faq", label: "FAQ" },
  { tab: "about", to: "/about", label: "About" },
  { tab: "contact", to: "/contact", label: "Contact" },
];

/** One more line under each fact, where a phone has the room to read it. */
const FACT_NOTES: Record<string, string> = {
  events: "One championship",
  classes: "Open to Grades 9–12",
  "student-run": "Faculty coordinate",
};

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
              <span className="m-fact-note">{fact.note ?? FACT_NOTES[fact.label]}</span>
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
      <p className="m-brochure">
        {isTodo(BROCHURE_URL) ? (
          <Value value={BROCHURE_URL} label="Brochure" />
        ) : (
          <a className="m-btn m-btn-ghost" href={BROCHURE_URL} download>
            Download the brochure
          </a>
        )}
      </p>
    </>
  );
}

/** The number as the brochure prints it on the page; the link dials the digits. */
const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

/**
 * The event in-charges are the fest's public contacts, so they lead the tab.
 * The teacher in charge is named below them but not numbered: her own email
 * and phone are not published anywhere on the site.
 */
function Contact() {
  return (
    <>
      <h2 className="m-h2 m-h2-lg m-tab-head">Contact</h2>
      <p className="m-muted m-small m-tab-lede">
        Questions about an event go to its student in-charges.
      </p>
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
            </div>
          ))}
        </dl>
      </div>
      <dl className="m-details">
        <div>
          <dt>Teacher in charge</dt>
          <dd>{contact.name}</dd>
        </div>
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
          <dd>
            Be at the school by 7:30 a.m. on {FEST_DAYS.offline.label}. The registration desk is
            open from 7:30 to 8:00 a.m.
          </dd>
        </div>
        <div>
          <dt>Instagram</dt>
          <dd>
            {isTodo(contact.instagram) ? (
              <Value value={contact.instagram} label="Instagram" />
            ) : (
              <a href={contact.instagramUrl} target="_blank" rel="noreferrer">
                {contact.instagram}
              </a>
            )}
          </dd>
        </div>
        <div>
          <dt>WhatsApp</dt>
          <dd>
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
              Join the community
            </a>
          </dd>
        </div>
        <div>
          <dt>Discord</dt>
          <dd>
            <a href={contact.discordUrl} target="_blank" rel="noreferrer">
              Join the server
            </a>
          </dd>
        </div>
      </dl>
    </>
  );
}

export function MobileResources({ tab }: { tab: ResourceTab }) {
  return (
    <MobileShell screen="resources">
      <ScreenHead image={getScene("resources")!.view!} title="Resources" accent="violet" />
      <div className="m-pad m-resources">
        <nav className="m-tabs" aria-label="Resources">
          {TABS.map((t) => (
            <Link
              key={t.tab}
              to={t.to}
              replace
              resetScroll={false}
              className="m-tab"
              aria-current={t.tab === tab ? "page" : undefined}
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
