/**
 * Single source of truth for every piece of Quantum V2.0 content.
 *
 * Anything whose value is not yet confirmed by the organising team is marked
 * with a `TODO` constant below and rendered through `isTodo()` so it is visible
 * in the UI instead of silently shipping as fake data. Everything else —
 * event copy, FAQ answers, About editorial — is final.
 */

/* ------------------------------------------------------------------ *
 * Settings, dates and the one value still to come. BROCHURE_URL is the
 * only placeholder left in this file.
 * ------------------------------------------------------------------ */

/** Marks a value the organisers still have to supply. */
export const TODO = "TODO" as const;

export function isTodo(value: string): boolean {
  return value.startsWith(TODO);
}

/**
 * The Google Apps Script web app bound to the "Quantum V2.0 Registrations"
 * sheet (source in backend/registrations.gs).
 *
 * No longer the only backend. When the Firebase environment variables are
 * set, Firestore takes each entry and this endpoint receives a copy so the
 * organisers' sheet keeps filling; when they are not, this is still the whole
 * backend on its own. Either way nothing here decides that —
 * src/lib/registrations.ts does, and `isRegistrationOpen()` is what the form
 * asks. Leave it as the TODO and the site says entries are not open.
 */
export const REGISTRATION_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwa6zpLvsYhGfnQOZTFf64d2wl6-oxAh8dMaLrprT8beOEHwBj1ynQ3cjKVwi8ZVVar/exec";

/** TODO: swap for the real brochure PDF once design signs it off. */
export const BROCHURE_URL = `${TODO} — brochure PDF URL`;

/**
 * The two fest days, from the brochure: every online event runs on the first
 * and every offline one at the school on the second. `iso` is what the
 * structured data needs; `label` is what a person reads.
 */
export const FEST_DAYS = {
  online: { iso: "2026-10-08", label: "8 October 2026" },
  offline: { iso: "2026-10-09", label: "9 October 2026" },
} as const;

/** The dates as one line, wherever a page answers "when is it". */
export const FEST_DATES = `${FEST_DAYS.online.label} online, ${FEST_DAYS.offline.label} at the school`;

/** Both days as one phrase, "8 and 9 October 2026". They share a month. */
export const FEST_SPAN = `${FEST_DAYS.online.label.split(" ")[0]} and ${FEST_DAYS.offline.label}`;

/** Last day to register for any event, from the brochure. */
export const REGISTRATION_CLOSES = { iso: "2026-10-05", label: "5 October 2026" } as const;

export const school = {
  name: "Air Force Bal Bharati School",
  city: "Lodhi Road, New Delhi",
} as const;

export const fest = {
  name: "Quantum",
  edition: "V2.0",
  fullName: "Quantum V2.0",
  kind: "Inter-school tech & culture fest",
} as const;

/* ------------------------------------------------------------------ *
 * The descent film.
 *
 * Measured from the supplied file (10.0 s, 1920x1080, 24 fps) by sampling
 * per-frame luma deltas across all 240 frames — not estimated. Boundaries sit
 * where the camera's rate of change actually breaks.
 * ------------------------------------------------------------------ */

/**
 * Where the beats actually fall, read off the film rather than asked for.
 *
 * Mean absolute frame-to-frame luma difference over all 240 frames, smoothed
 * across five, marks each boundary: the aerial's drift sits under 5, the
 * canyon covers two acceleration bursts peaking near 15-18, and the arrival
 * decays smoothly from the second burst with no sharp elbow. Unlike the
 * previous film's empty street, this one keeps traffic and pedestrians
 * moving through the hold, so it never reads as fully stopped the way a 0.1
 * floor would — the plate is still the exact final frame regardless.
 */
export const timeline = {
  /** Container duration in seconds. 240 frames at the source's 24fps. */
  duration: 10.0,
  /**
   * Wide aerial: moon centred, light beam, skyline below. Re-measured against
   * this film's own motion (frame-to-frame luma difference, smoothed over 5):
   * it stays under 5 through 2.708s, the same "stays under 5" rule the
   * previous film's beats were cut on.
   */
  aerial: [0, 2.708],
  /**
   * Descent through the canyon. Two acceleration bursts (peaks near 4.5s and
   * 7.0s) rather than one continuous swoop — this film's camera move is not
   * a single easing curve like the last one's, so this range covers both.
   */
  canyon: [2.708, 7.25],
  /** Deceleration into the crossroads. Smooth decay, no sharp elbow. */
  arrival: [7.25, 9.5],
  /**
   * Camera holds, but unlike the last film this street is not empty: cars and
   * pedestrians keep the frame alive right through the last frame, so the
   * luma-difference floor here is a few percent of the canyon's peak, not the
   * near-zero the empty street gave. The plate is still that exact final
   * frame, so the cut itself is unaffected.
   */
  hold: [9.5, 10.0],
} as const;

/* ------------------------------------------------------------------ *
 * Events
 *
 * Names, team sizes, days, rules and coordinators are the fest brochure's.
 * ------------------------------------------------------------------ */

export type Accent = "cyan" | "magenta" | "violet";

/** Online events run on the first fest day, offline ones at the school on the second. */
export type EventMode = keyof typeof FEST_DAYS;

export type QuantumEvent = {
  /**
   * The event's permanent key, and deliberately not its name. It is stored
   * with every registration, listed in firestore.rules and
   * backend/registrations.gs, hashed into the duplicate check and used in
   * `?event=` links, so renaming an event never touches it. That is why
   * these ids still carry the working titles the events had before the
   * brochure named them.
   */
  id: string;
  name: string;
  tagline: string;
  team: string;
  /**
   * How many students the event takes, as the brochure gives it. The
   * registration form draws exactly `max` places and needs `min` of them
   * filled; `team` is the same numbers in words, and both come from sized().
   */
  size: { min: number; max: number };
  mode: EventMode;
  description: string;
  format: string[];
  accent: Accent;
  /** The student in-charges, with the numbers the brochure prints for them. */
  coordinators: Coordinator[];
};

/** An event's student in-charge. `phone` is shown as written; a tel: link strips the spaces. */
export type Coordinator = { name: string; phone: string };

/** A team size, and the same size in words: "Solo", "Team of 2", "Team of 2–3". */
function sized(min: number, max = min): Pick<QuantumEvent, "team" | "size"> {
  return {
    team: max === 1 ? "Solo" : min === max ? `Team of ${min}` : `Team of ${min}–${max}`,
    size: { min, max },
  };
}

/**
 * The order is load-bearing, not presentational. It is the canonical order an
 * entry's event ids are sent in, and firestore.rules and the Apps Script both
 * require exactly this order: an entry sent in any other is refused, and the
 * form reads that refusal as "already registered". Reordering the rail means
 * changing both of those and redeploying them first.
 */
export const events: QuantumEvent[] = [
  {
    id: "quiz",
    name: "The Q Factor",
    tagline: "A screen-based qualifier, then a six-team final.",
    ...sized(2),
    mode: "offline",
    description:
      "A two-stage team quiz on general and contemporary knowledge. Every registered team plays a screen-based qualifier and the top six go through to the finals. The questions reward speed, recall, observation and quick decisions.",
    format: [
      "Qualifier: a screen-based quiz open to every registered team",
      "The top six teams go through to the finals",
      "Finals: quickfire, open buzzer, visual trivia and a surprise round",
      "Questions cover entertainment, food, pop culture, sports, technology and current affairs",
    ],
    accent: "cyan",
    coordinators: [
      { name: "Linisha Das", phone: "+91 98185 84550" },
      { name: "Aayush Singh", phone: "+91 95123 73880" },
    ],
  },
  {
    id: "film-making",
    name: "Take Two",
    tagline: "An original short film on an assigned theme.",
    ...sized(4),
    mode: "online",
    description:
      "An online short-film event. Each team is given a theme and a constraint in advance and makes an original film of up to five minutes around them. All footage must be shot by the team, and stock footage is not allowed.",
    format: [
      "Team numbers, themes and constraints are shared before the event",
      "Give the film a title; anything over five minutes can be marked down or disqualified",
      "Submit an MP4 of at least 1080p, up to 5 GB, as a Google Drive link",
      "Judged on creativity, technical skill, relevance to the theme and narrative clarity",
    ],
    accent: "magenta",
    coordinators: [
      { name: "Rudransh Singh", phone: "+91 93118 98350" },
      { name: "Riddhiman Srivastava", phone: "+91 88004 30107" },
    ],
  },
  {
    id: "ad-shoot",
    name: "Mirage.exe",
    tagline: "Recreate a game's home screen in two hours.",
    ...sized(2),
    mode: "offline",
    description:
      "Choose a game and recreate its iconic home screen on film, shooting and editing everything in a two-hour window on the day. All footage is shot during the competition on your own devices, and AI-generated content is not allowed.",
    format: [
      "Two hours to shoot and edit, using only footage filmed during the competition",
      "Shoot and edit on your own devices, phones included, and bring chargers: the venue has sockets but no internet",
      "Submit the recreation, a short write-up and the software you used by Google Drive link when the two hours end",
      "Judged on creativity, visual accuracy, technical skill, conceptual understanding and time management",
    ],
    accent: "violet",
    coordinators: [
      { name: "Manasvi Singh", phone: "+91 93113 89955" },
      { name: "Naved", phone: "+91 98996 48234" },
    ],
  },
  {
    id: "surprise",
    name: "Surprise",
    tagline: "Classified until the doors open.",
    ...sized(2, 3),
    mode: "offline",
    description:
      "Nothing about this event is revealed before the day. Teams get the brief on the spot, with time to prepare there, and every material they need is provided. The round runs for 60 to 90 minutes.",
    format: [
      "The brief is revealed on the day, with time to prepare on the spot",
      "All materials are provided, and technology is not allowed unless the organisers say so",
      "Teams must finish inside the time limit of 60 to 90 minutes",
      "Judged on creativity, innovation, execution, teamwork and overall performance",
    ],
    accent: "cyan",
    coordinators: [
      { name: "Shayan Khan", phone: "+91 84475 85283" },
      { name: "Hamza", phone: "+91 93557 55528" },
      { name: "Ishita", phone: "+91 95610 26991" },
    ],
  },
  {
    id: "online-gaming",
    name: "Ryoken",
    tagline: "A solo bracket that opens on Brawlhalla.",
    ...sized(1),
    mode: "online",
    description:
      "A solo gaming tournament. Round one is Brawlhalla, played 1v1 against an assigned opponent, and winners move on through the bracket. Each player is responsible for their own game, controls and internet connection.",
    format: [
      "Round 1: Brawlhalla, 1v1 against an assigned opponent",
      "Winners advance through the tournament bracket",
      "Check your game, controls and connection before your match",
      "Report a technical problem to the organisers rather than leaving the match",
    ],
    accent: "magenta",
    coordinators: [
      { name: "Rudransh Singh", phone: "+91 93118 98350" },
      { name: "Nitya", phone: "+91 88009 13357" },
    ],
  },
  {
    id: "pitch",
    name: "Innopreneur",
    tagline: "A two-page brief, then the pitch.",
    ...sized(2),
    mode: "offline",
    description:
      "An innovation and entrepreneurship event. Each team sends in a two-page PDF brief on its idea, covering the problem, the proposed solution, what is new about it and the impact it could have, then presents it to the judges, who use the brief as their reference.",
    format: [
      "Submit a two-page PDF brief: the problem, your solution, the innovation and the expected impact",
      "The deadline and submission guidelines are sent once registration closes",
      "Present the idea to the judges, who read the brief as their reference",
    ],
    accent: "violet",
    coordinators: [
      { name: "Aditya Singh", phone: "+91 89293 22752" },
      { name: "Mehal Khanna", phone: "+91 88262 46555" },
    ],
  },
];

export function getEvent(id: string): QuantumEvent | undefined {
  return events.find((e) => e.id === id);
}

/** When and how an event runs, in the words a page shows it: "9 October 2026, at the school". */
export function eventDay(event: QuantumEvent): string {
  return `${FEST_DAYS[event.mode].label}, ${event.mode === "online" ? "online" : "at the school"}`;
}

/* ------------------------------------------------------------------ *
 * Scenes — the crossroads hub and the four interiors it opens into.
 *
 * `sign` geometry is expressed in percentages of the 1280x720 crossroads
 * plate, measured off the film's final frame. `skew` matches the panel's
 * plane so a flat DOM rectangle sits on the billboard convincingly.
 * ------------------------------------------------------------------ */

export type SignGeometry = {
  /** Percent of plate width/height. */
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * The panel's four corners — top-left, top-right, bottom-right, bottom-left
   * — as percentages of this sign's own box.
   *
   * The holograms in the film are perspective quadrilaterals: every one of
   * them has four different edge lengths and no right angles. A skew plus a
   * yaw can only ever approximate that, which is what left the old panels
   * sitting slightly proud of their frames. These corners are measured off
   * the plate itself and the panel is clipped to them, so it lands on the
   * glass exactly.
   *
   * The clip shapes the panel; it does not transform it. The label inside
   * stays upright and undistorted — the billboard takes the perspective, the
   * text does not.
   */
  clip: [number, number][];
  /** Stack the label vertically, for the tall blade sign. */
  vertical?: boolean;
  /**
   * Short-and-wide banner: one line, no blurb. Without this a two-word label
   * wraps and the first line is clipped off the top of the panel.
   */
  compact?: boolean;
};

export type Scene = {
  id: string;
  /** Label used on the signboard, in the nav, and as the destination's title. */
  label: string;
  /** One line under the label, on the sign and in the mobile list. */
  blurb: string;
  /** In-app destination. Ignored when `href` is set. */
  to: string;
  /**
   * An address outside the router — a PDF, another site. A board with one of
   * these is an anchor rather than a Link, and when the address is still a
   * TODO it is not a link at all: see Hub.tsx. `to` stays as the fallback
   * the board would have used.
   */
  href?: string;
  accent: Accent;
  sign: SignGeometry;
  /**
   * Interior window view. Only the rooms have one: Events, Team and
   * Resources. A sign that leads straight to a page, like Register, or out
   * to a file, like the brochure, has no interior to look into.
   */
  view?: string;
  /** What the room or page is, for descriptions of it. */
  room: string;
};

export const scenes: Scene[] = [
  {
    id: "events",
    label: "Events",
    blurb: "Six events. One championship.",
    to: "/events",
    accent: "cyan",
    sign: {
      left: 2.81,
      top: 15.19,
      width: 19.64,
      height: 34.35,
      clip: [
        [0.3, 0.0],
        [98.9, 36.9],
        [100.0, 100.0],
        [0.0, 88.4],
      ],
    },
    view: "/media/view-events.webp",
    room: "A control room lined with six screens, one per event.",
  },
  {
    id: "register",
    label: "Register",
    blurb: "Pick your events and enter.",
    to: "/register",
    accent: "magenta",
    sign: {
      left: 76.15,
      top: 18.33,
      width: 20.52,
      height: 32.31,
      clip: [
        [2.0, 39.8],
        [99.2, 0.0],
        [100.0, 89.4],
        [0.0, 100.0],
      ],
    },
    room: "The entry form, one for every event.",
  },
  {
    id: "team",
    label: "Meet the Team",
    blurb: "The students running it.",
    to: "/team",
    accent: "cyan",
    sign: {
      left: 44.64,
      top: 32.31,
      width: 9.53,
      height: 8.15,
      clip: [
        [1.1, 3.4],
        [100.0, 0.0],
        [100.0, 96.6],
        [0.0, 100.0],
      ],
      compact: true,
    },
    view: "/media/view-team.webp",
    room: "A crew room hung with framed portraits of the organising team.",
  },
  {
    id: "resources",
    label: "Resources",
    blurb: "Questions, background, contact.",
    to: "/resources",
    accent: "violet",
    sign: {
      left: 62.81,
      top: 36.48,
      width: 3.33,
      height: 19.91,
      clip: [
        [4.7, 6.0],
        [93.8, 0.0],
        [100.0, 97.7],
        [0.0, 100.0],
      ],
      vertical: true,
    },
    view: "/media/view-resources.webp",
    room: "An archive room with a wall of labelled links.",
  },
  {
    /*
     * This board was the FAQ. The FAQ is still one tap away — it is in the
     * menu, in the footer, and it is one of the three screens in the
     * Resources room — and a brochure is the thing people actually ask for
     * when they are deciding whether to enter.
     *
     * Its address is BROCHURE_URL, which is still a placeholder. Until it is
     * a real one the board renders as a board and not as a link, rather than
     * putting a 404 on the crossroads.
     */
    id: "brochure",
    label: "Brochure",
    blurb: "The fest in one PDF.",
    href: BROCHURE_URL,
    to: "/faq",
    accent: "violet",
    sign: {
      left: 32.97,
      top: 34.26,
      width: 2.92,
      height: 21.02,
      clip: [
        [1.8, 1.8],
        [100.0, 0.0],
        [94.6, 99.1],
        [0.0, 100.0],
      ],
      vertical: true,
    },
    room: "The fest brochure, as a PDF.",
  },
];

export function getScene(id: string): Scene | undefined {
  return scenes.find((s) => s.id === id);
}

/** Plate shared by the hub and every phase transition. */
export const crossroadsPlate = {
  webp: "/media/crossroads.webp",
  jpg: "/media/crossroads.jpg",
  width: 1920,
  height: 1080,
  alt: "A neon crossroads at night, traffic and pedestrians beneath a full moon and a vertical beam of light, blank lit billboard panels down both sides of the street.",
} as const;

export const descentFilm = {
  src: "/media/descent.mp4",
  poster: "/media/descent-poster.webp",
  width: 1920,
  height: 1080,
  alt: "A full moon over a neon city skyline, a vertical beam of light rising from the streets below.",
} as const;

/* ------------------------------------------------------------------ *
 * Contact
 * ------------------------------------------------------------------ */

export const contact = {
  /**
   * The teacher in charge. Her number is on Contact, under General inquiries,
   * for anything that is not about one event; questions about an event go to
   * its coordinators, whose numbers are on each event above. Her email is
   * deliberately not in this file, so no page can print it.
   */
  name: "Anjali Rawlley",
  role: "Teacher in charge",
  /** Written the way the brochure writes the in-charges' numbers. */
  phone: "+91 98713 79429",
  /** The fest's own account: shown as the handle, linked to the profile. */
  instagram: "@quantum.afbbs",
  instagramUrl: "https://www.instagram.com/quantum.afbbs/",
  /**
   * Where live updates go, both from the brochure. The WhatsApp code was read
   * off the printed page, capital I and all: its height matches the capitals
   * around it, not the taller ascenders of h and k.
   */
  whatsappUrl: "https://chat.whatsapp.com/DwXIcGuthWRCZkkAxzeuuw",
  discordUrl: "https://discord.com/invite/rD7pJDzFZ",
  school: school.name,
  address: school.city,
} as const;

/* ------------------------------------------------------------------ *
 * The team, as the brochure lists it.
 * ------------------------------------------------------------------ */

/**
 * One line of the crew: a job and the people doing it.
 *
 * The brochure names people by team rather than by title, and most of them by
 * first name only, so the crew is kept that way rather than dressed up as an
 * org chart the brochure does not give. `photo` is for a group picture once
 * there is one; until then the group's card shows its initials.
 */
export type CrewGroup = { role: string; names: string[]; photo?: string };

export type CrewSection = {
  heading: string;
  /**
   * Said after a group's role wherever it stands alone, off the page that
   * gives it its heading: "The Q Factor coordinators", on the ring's card.
   */
  noun?: string;
  groups: CrewGroup[];
};

export const crew: CrewSection[] = [
  {
    heading: "Faculty",
    groups: [{ role: contact.role, names: [contact.name] }],
  },
  {
    heading: "Event coordinators",
    noun: "coordinators",
    groups: events.map((event) => ({
      role: event.name,
      names: event.coordinators.map((c) => c.name),
    })),
  },
  {
    heading: "Organising teams",
    groups: [
      {
        role: "PR Team",
        names: ["Aadi", "Arnav", "Tejasvi", "Tejbir", "Vidushi", "Avni", "Utkarsh"],
      },
      { role: "Web Design Team", names: ["Medansh", "Mudit", "Naman"] },
      { role: "Creative Team", names: ["Sudeeti", "Anushri", "Shagun", "Vidisha"] },
      {
        role: "Social Media Team",
        names: ["Anamta", "Ananya", "Vihaan"],
      },
    ],
  },
];

/** The last line on Meet the Team, on both layouts. */
export const teamClosing =
  "Quantum is student-run end to end. Students write the quiz, judge the prelims, cut the highlight reel, run the brackets and staff the help desk. Faculty is in-charge of coordination.";

/** "A", "A and B", "A, B and C". */
export function listOf(items: readonly string[]): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/* ------------------------------------------------------------------ *
 * FAQ
 * ------------------------------------------------------------------ */

/** The FAQ page's own title and the line under it. */
export const faqPage = {
  title: "Frequently Asked Questions",
  tagline: "Key details on eligibility, registrations, tournament structure, and platform rules.",
} as const;

const eventNames = (mode: EventMode) =>
  listOf(events.filter((event) => event.mode === mode).map((event) => event.name));

export const faqs = [
  {
    q: "Who is eligible to participate in Quantum V2.0?",
    a: "Students from classes 9 to 12. Every event is open to all four classes, and each school can enter one team per event. Team sizes differ from event to event and are listed on the Events page.",
  },
  {
    q: "When is Quantum V2.0, and when do registrations close?",
    a: `Registrations close on ${REGISTRATION_CLOSES.label}. The online events, ${eventNames("online")}, will take place on ${FEST_DAYS.online.label}. The offline events, ${eventNames("offline")}, run at ${school.name} on ${FEST_DAYS.offline.label}.`,
  },
  {
    q: "Can individual students register?",
    a: "No. Entries must go through schools. Every team's points count toward its school's overall championship. The school's teacher in-charge registers its teams, one per event, and comes with the students on the offline day.",
  },
  {
    q: "Can a student take part in more than one event?",
    a: "No. Each student can compete in only one event, so a school entering several events needs a team comprising of different students for each event.",
  },
  {
    q: "Is there any registration fee?",
    a: "No. Entry to Quantum V2.0 is completely free for all invited schools and confirmed delegations.",
  },
  {
    q: "Important information to know before Quantum",
    a: `Schools must reach ${school.name} by 7:30 a.m. on ${FEST_DAYS.offline.label}, and the registration desk will be open from 7:30 to 8:00 a.m. Participants to come in school uniforms with a teacher in charge. Every school is required to stay for both the opening and closing ceremonies. Arriving late can cut into preparation or performance time and can lead to disqualification.`,
  },
  {
    q: "Where will updates and announcements be shared?",
    a: `On the Quantum WhatsApp community, the Discord server and Instagram at ${contact.instagram}, as well as on this website. Join the WhatsApp community and the Discord server for updates about your events; both links are on the Contact page. All links have been provided in the brochure.`,
  },
  {
    q: "What equipment or software do participants need to prepare?",
    a: `The host school does not provide internet access. ${getEvent("ad-shoot")!.name} is to be shot and edited on your own devices, so bring them with their chargers, and ${getEvent("online-gaming")!.name} players need their game, controls and connection working before their match. Whether phones, AI tools or other technology are allowed is set by each event's own rules.`,
  },
  {
    q: "How are ties and disputes resolved?",
    a: "All entries and submissions undergo blinded evaluation under structured judging rubrics. In the event of a points tie or technical dispute, the decision of the AFBBS Organising Committee and judging panel is absolute and binding.",
  },
];

/* ------------------------------------------------------------------ *
 * About — final editorial copy.
 * ------------------------------------------------------------------ */

/**
 * Facts worth stating flat, above the prose, with the one line of detail a
 * bare number cannot carry on its own.
 */
export const festFacts: readonly { value: string; label: string; note: string }[] = [
  { value: String(events.length), label: "events", note: "One championship" },
  { value: "2", label: "days", note: "8 Oct online · 9 Oct offline" },
  { value: "9–12", label: "classes", note: "Open to Grades 9–12" },
  { value: "100%", label: "student-run", note: "Faculty is in-charge of coordination." },
];

export const about = {
  title: "About Quantum V2.0",
  tagline: "The intersection of intellect, code, and digital warfare.",
  intro: {
    heading: "The Descent into Excellence",
    body: [
      "Organised by the Computer Club of Air Force Bal Bharati School, Quantum is an inter-school technology symposium designed to test the limits of modern digital literacy and technical problem-solving. Across six events, all teams take on a two-stage quiz, an online short film, a recreation of a game's home screen, a Brawlhalla bracket, an innovation pitch and one event that stays sealed until the final day.",
      "Following its debut edition, Quantum V2.0 raises the benchmark with more rigorous prompts, refined tournament brackets, and a cyber-kinetic competitive atmosphere.",
    ],
  },
  scoring: {
    heading: "The Championship & Scoring",
    line: "Six standalone events. One ultimate championship.",
  },
} as const;

/* ------------------------------------------------------------------ *
 * Resources: the FAQ, About and Contact as one place.
 *
 * Both layouts show the same three tabs with the same content: the desk's
 * three monitors on a wide screen, the tab bar on a phone. Anything either
 * layout says about contacting the fest is here, so the two cannot drift.
 * ------------------------------------------------------------------ */

export type ResourceTab = "faq" | "about" | "contact";

/**
 * The tabs in order. Each is its own address, so a link or a reload opens
 * on the right one, and the same three addresses answer on both layouts.
 */
export const resourceTabs = [
  {
    id: "faq",
    to: "/faq",
    label: "FAQ",
    blurb: `${faqs.length} answers on eligibility, registration, fees and rules.`,
  },
  {
    id: "about",
    to: "/about",
    label: "About",
    blurb: "What Quantum is, how it is scored, and who runs it.",
  },
  {
    id: "contact",
    to: "/contact",
    label: "Contact",
    blurb: "Who to call about each event, and where the fest posts updates.",
  },
] as const satisfies readonly { id: ResourceTab; to: string; label: string; blurb: string }[];

/** The tab an address opens on: /faq, /about and /contact, with or without a trailing slash. */
export function resourceTabAt(pathname: string): ResourceTab | null {
  const path = pathname.replace(/\/+$/, "");
  return resourceTabs.find((tab) => tab.to === path)?.id ?? null;
}

/** The Contact tab's own title and the line that introduces it. */
export const contactPage = {
  title: "Contact",
  lede: "Questions about an event go to its student in-charges, whose numbers are on this page. For live updates through both fest days, follow the WhatsApp community, Discord or Instagram.",
  /** Under the event contacts. */
  faculty: `Teacher in-charge is Mrs. ${contact.name}. For information about a particular event, the event's in-charges are to be contacted.`,
  /** Anything that is not about one event goes to the teacher in charge. */
  general: {
    heading: "General inquiries",
    note: "For anything that is not about a particular event.",
    name: `Mrs. ${contact.name}`,
  },
} as const;

/** Where the fest posts its updates, and what each one is for. */
export const updateChannels = [
  {
    id: "instagram",
    label: "Instagram",
    who: undefined,
    value: contact.instagram,
    href: contact.instagramUrl,
    note: "Announcements, results and the highlight reel.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    who: "community",
    value: "Join the community",
    href: contact.whatsappUrl,
    note: "Live updates through both fest days, and news about the events you are in.",
  },
  {
    id: "discord",
    label: "Discord",
    who: "server",
    value: "Join the server",
    href: contact.discordUrl,
    note: "Updates about your own events, alongside the WhatsApp community.",
  },
] as const;

/** What to do on the offline day, from the brochure. The FAQ says the same at more length. */
export const onTheDay = `On ${FEST_DAYS.offline.label}, be at the school by 7:30 a.m.: the registration desk will be open from 7:30 to 8:00 a.m. Bring your confirmation email, and come in school uniform. Come with your respective teacher in-charges.`;

/** The lines that send a visitor from one tab to the other when the answer is there. */
export const resourceHints = {
  /** At the foot of the FAQ. */
  notAnswered:
    "Not answered here? Call the in-charges of the event you are asking about. Their numbers are under Contact.",
  /** At the foot of Contact. */
  beforeYouCall:
    "Most questions we get are already answered in the FAQ: who can enter, how entries are submitted, fees, and what you need to prepare.",
} as const;
