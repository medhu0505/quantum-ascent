/**
 * Single source of truth for every piece of Quantum V2.0 content.
 *
 * Anything whose value is not yet confirmed by the organising team is marked
 * with a `TODO` constant below and rendered through `isTodo()` so it is visible
 * in the UI instead of silently shipping as fake data. Everything else —
 * event copy, FAQ answers, About editorial — is final.
 */

/* ------------------------------------------------------------------ *
 * Unconfirmed values. Replace these; nothing else in this file is a
 * placeholder.
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

/** TODO: fest dates are not public yet. */
export const FEST_DATES = `${TODO} — fest dates`;

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
 * ------------------------------------------------------------------ */

export type Accent = "cyan" | "magenta" | "violet";

export type QuantumEvent = {
  id: string;
  name: string;
  tagline: string;
  team: string;
  description: string;
  format: string[];
  accent: Accent;
};

export const events: QuantumEvent[] = [
  {
    id: "quiz",
    name: "Quiz",
    tagline: "Know it. Buzz it. Own it.",
    team: "Solo or team of 2",
    description:
      "A fast, three-round general and tech quiz. Written prelims cut the field, then the finalists face buzzer rounds on science, current affairs, pop culture and the history of computing.",
    format: [
      "Round 1 — written prelims, 25 questions",
      "Round 2 — themed buzzer rounds on stage",
      "Round 3 — rapid fire with negative marking",
    ],
    accent: "cyan",
  },
  {
    id: "film-making",
    name: "Film Making",
    tagline: "Thirty-six hours. One story.",
    team: "Team of 3–5",
    description:
      "Shoot and cut a short film on a theme released at the start of the fest. Everything — footage, sound, edit — must be produced inside the window. Judged on story, craft and sound design.",
    format: [
      "Theme revealed at kick-off",
      "3–5 minutes, submitted as MP4",
      "All footage shot during the fest window",
    ],
    accent: "magenta",
  },
  {
    id: "ad-shoot",
    name: "Ad Shoot",
    tagline: "Sixty seconds to sell the impossible.",
    team: "Team of 2–4",
    description:
      "You get an absurd product and one minute of screen time. Write it, shoot it, perform it. Judged on the idea first and polish second — the funniest concept usually wins the room.",
    format: [
      "Product assigned on the spot",
      "60-second ad, live or filmed",
      "Scored on concept, delivery and edit",
    ],
    accent: "violet",
  },
  {
    id: "surprise",
    name: "Surprise",
    tagline: "Classified until the doors open.",
    team: "Announced on the day",
    description:
      "One event stays sealed. The challenge, the team size and the rules are revealed only on the morning of the fest. Bring a general kit: laptop, pens, paper and nerve.",
    format: [
      "Brief revealed on fest morning",
      "Registration opens the same morning",
      "Same points weight as every other event",
    ],
    accent: "cyan",
  },
  {
    id: "online-gaming",
    name: "Online Gaming",
    tagline: "Ladder up. Last squad standing.",
    team: "Solo or squad",
    description:
      "Bracketed tournaments across a solo title and a squad title. Seeded qualifiers run through the morning and the finals are cast live on the main screen.",
    format: [
      "Seeded double-elimination bracket",
      "Own peripherals allowed, no external comms",
      "Finals streamed to the main hall",
    ],
    accent: "magenta",
  },
  {
    id: "pitch",
    name: "Pitch",
    tagline: "Five minutes in front of the money.",
    team: "Team of 2–3",
    description:
      "Build a startup case around a real problem and defend it. Five minutes to pitch, three to survive questions from the panel. Slides are optional, numbers are not.",
    format: [
      "5-minute pitch, 3-minute grilling",
      "Problem, solution, market, model",
      "Deck submitted before the round",
    ],
    accent: "violet",
  },
];

export function getEvent(id: string): QuantumEvent | undefined {
  return events.find((e) => e.id === id);
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
   * Interior window view. Only the four rooms have one; a sign that points
   * at an ordinary page (the FAQ) has no interior to look into.
   */
  view?: string;
  /** What the room is, for the interior's accessible description. */
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
    view: "/media/view-register.webp",
    room: "A gaming desk facing three monitors, the city outside the window behind it.",
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
 * Team roster — TODO, not yet finalised.
 * ------------------------------------------------------------------ */

/**
 * `photo` is unset for everyone until the organisers supply portraits. The
 * roster carousel draws an empty frame for anyone without one rather than a
 * broken image, so filling these in is the only step needed to light it up.
 */
export type TeamMember = { name: string; role: string; photo?: string };

export const team: TeamMember[] = [
  { name: `${TODO} — name`, role: "Fest Head" },
  { name: `${TODO} — name`, role: "Deputy Fest Head" },
  { name: `${TODO} — name`, role: "Events Lead" },
  { name: `${TODO} — name`, role: "Tech Lead" },
  { name: `${TODO} — name`, role: "Design Lead" },
  { name: `${TODO} — name`, role: "Media & Coverage" },
  { name: `${TODO} — name`, role: "Hospitality" },
  { name: `${TODO} — name`, role: "Faculty Coordinator" },
];

/* ------------------------------------------------------------------ *
 * FAQ
 * ------------------------------------------------------------------ */

/** The FAQ page's own title and the line under it. */
export const faqPage = {
  title: "Frequently Asked Questions",
  tagline: "Key details on eligibility, registrations, tournament structure, and platform rules.",
} as const;

export const faqs = [
  {
    q: "Who is eligible to participate in Quantum V2.0?",
    a: "Participation is open to students from recognized schools across Grades 8 through 12. Individual events have specific grade brackets and squad limits—refer to the Events page for each category's exact roster size.",
  },
  {
    q: "Can individual students register, or must entries go through schools?",
    a: "All registrations must be officially submitted via the school registration form. The designated Teacher-in-Charge or Student Club President should finalize and submit the consolidated roster to ensure scores are credited toward the Overall Championship.",
  },
  {
    q: "Is there any registration fee?",
    a: "No. Entry to Quantum V2.0 is completely free for all invited schools and confirmed delegations.",
  },
  {
    q: "Where will prompts, bracket updates, and announcements be shared?",
    a: "All real-time match fixtures, problem statements, rule clarifications, and server links are distributed through the official Quantum Discord server and emailed directly to registered team points of contact.",
  },
  {
    q: "What equipment or software do participants need to prepare?",
    a: "For online preliminary rounds, participants must have a stable internet connection, a desktop or laptop, and the necessary tools (IDE, design software, or specific game clients) pre-installed. Specific hardware and software requirements are listed under individual event briefs.",
  },
  {
    q: "How are ties and disputes resolved?",
    a: "All entries and submissions undergo blinded evaluation under structured judging rubrics. In the event of a points tie or technical dispute, the decision of the AFBBS Organising Committee and judging panel is absolute and final.",
  },
];

/* ------------------------------------------------------------------ *
 * About — final editorial copy.
 * ------------------------------------------------------------------ */

/** Facts worth stating flat, above the prose. */
export const festFacts = [
  { value: String(events.length), label: "events" },
  { value: "1", label: "day" },
  { value: "9–12", label: "classes" },
  { value: "100%", label: "student-run" },
] as const;

export const about = {
  title: "About Quantum V2.0",
  tagline: "The intersection of intellect, code, and digital warfare.",
  intro: {
    heading: "The Descent into Excellence",
    body: [
      "Organised by the Computer Club of Air Force Bal Bharati School, Quantum is an inter-school technology symposium designed to test the limits of modern digital literacy and technical problem-solving. From high-stakes competitive programming and full-stack web development to cryptic hunts, audio-visual production, and gaming, Quantum gathers school teams to compete on a singular proving ground.",
      "Following its debut edition, Quantum V2.0 raises the benchmark with more rigorous prompts, refined tournament brackets, and a cyber-kinetic competitive atmosphere.",
    ],
  },
  scoring: {
    heading: "The Championship & Scoring",
    line: "Six standalone events. One ultimate championship.",
  },
} as const;

/* ------------------------------------------------------------------ *
 * Contact — TODO, not yet finalised.
 * ------------------------------------------------------------------ */

export const contact = {
  /** Who answers the email and the phone below — shown with them. */
  name: "Anjali Rawlley",
  role: "Teacher in charge",
  email: "anjalirawlley@gmail.com",
  /** Shown as written; the tel: link strips the spaces. */
  phone: "+91 98713 79429",
  instagram: `${TODO} — fest Instagram handle`,
  school: school.name,
  address: school.city,
} as const;
