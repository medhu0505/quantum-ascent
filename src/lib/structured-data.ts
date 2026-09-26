import { about, contact, events, fest, isTodo, school, FEST_DATES } from "@/data/quantum";

/**
 * Schema.org description of the fest.
 *
 * Emitted site-wide so search engines understand Quantum as one event with six
 * sub-events rather than a set of unrelated pages. `startDate` is omitted while
 * the dates are unconfirmed: an invented date is worse than an absent one, and
 * the block is still valid structured data without it.
 *
 * The fest runs over two days, one online and one offline, so the fest as a
 * whole is a mixed event. The sub-events carry no attendance mode of their
 * own because which day each one runs on is not published yet, and stating it
 * would be a guess.
 */
export function festJsonLd() {
  const datesKnown = !isTodo(FEST_DATES);

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

  const organizer = {
    "@type": "EducationalOrganization",
    name: school.name,
    ...(isTodo(contact.email) ? {} : { email: contact.email }),
  };

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: fest.fullName,
    alternateName: `${fest.name} ${fest.edition}`,
    description: about.intro.body[0],
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    ...(datesKnown ? { startDate: FEST_DATES } : {}),
    location: place,
    organizer,
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: "School students, classes 9 to 12",
    },
    subEvent: events.map((event) => ({
      "@type": "Event",
      name: event.name,
      description: event.description,
      location: place,
      organizer,
      eventStatus: "https://schema.org/EventScheduled",
    })),
  };
}
