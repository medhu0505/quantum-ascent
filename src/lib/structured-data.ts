import { about, contact, events, faqs, fest, school, FEST_DAYS } from "@/data/quantum";

/**
 * The FAQ as FAQPage structured data, because these are the questions that
 * actually bring people to a fest site from search. Rendered by the FAQ in
 * both layouts: the phone one is what the server sends, so it is the one a
 * crawler reads.
 */
export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * Schema.org description of the fest.
 *
 * Emitted site-wide so search engines understand Quantum as one event with six
 * sub-events rather than a set of unrelated pages.
 *
 * The fest runs over two days, the online events on the first and the rest at
 * the school on the second, so the fest as a whole is a mixed event and each
 * sub-event carries its own day and mode. Only the offline ones name a place.
 * An online event would need a VirtualLocation URL where it is attended, and
 * the brochure gives none: Take Two is a film sent in by link, and Ryoken is
 * played in the game itself.
 */
export function festJsonLd() {
  const place = {
    "@type": "Place",
    name: school.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: school.city,
      addressLocality: "New Delhi",
      addressCountry: "IN",
    },
  };

  // No email: the fest's contacts are its event coordinators, listed on the
  // Contact page, and the teacher in charge's own address is not published.
  const organizer = {
    "@type": "EducationalOrganization",
    name: school.name,
  };

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: fest.fullName,
    alternateName: `${fest.name} ${fest.edition}`,
    description: about.intro.body[0],
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    startDate: FEST_DAYS.online.iso,
    endDate: FEST_DAYS.offline.iso,
    location: place,
    organizer,
    // The fest's own account, so search engines can tie it to the event.
    sameAs: [contact.instagramUrl],
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: "School students, classes 9 to 12",
    },
    subEvent: events.map((event) => ({
      "@type": "Event",
      name: event.name,
      description: event.description,
      startDate: FEST_DAYS[event.mode].iso,
      eventAttendanceMode:
        event.mode === "online"
          ? "https://schema.org/OnlineEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
      ...(event.mode === "offline" ? { location: place } : {}),
      organizer,
      eventStatus: "https://schema.org/EventScheduled",
    })),
  };
}
