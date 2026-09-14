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

/** TODO: swap for the real registration form (Google Form, Fillout, etc.). */
export const REGISTRATION_FORM_URL = `${TODO} — external registration form URL`;

/** TODO: swap for the real brochure PDF once design signs it off. */
export const BROCHURE_URL = `${TODO} — brochure PDF URL`;

/** TODO: fest dates are not public yet. */
export const FEST_DATES = `${TODO} — fest dates`;

export const school = {
  name: "A.F.S. Bal Bharati School",
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
 * Measured from the supplied file (10.006 s, 1280x720, 24 fps) by sampling
 * per-frame luma deltas across all 240 frames — not estimated. Boundaries sit
 * where the camera's rate of change actually breaks.
 * ------------------------------------------------------------------ */

export const timeline = {
  /** Container duration in seconds. */
  duration: 10.006,
  /** Wide aerial: moon centred, light beam, skyline below. Slow drift. */
  aerial: [0, 2.4],
  /** Descent through the skyscraper canyon of billboard panels. Fast. */
  canyon: [2.4, 7.0],
  /** Deceleration into the crossroads. */
  arrival: [7.0, 9.5],
  /** Camera holds. The final frame is the crossroads plate. */
  hold: [9.5, 10.006],
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
  /** Degrees of vertical skew matching the billboard's plane. */
  skew: number;
  /**
   * Degrees of yaw, so the panel sits on the building's wall rather than
   * flat to the camera. Positive turns the right edge away, which is what a
   * panel on the left-hand side of the street does; right-hand panels take a
   * negative value.
   */
  yaw: number;
  /**
   * How much of the scene's atmospheric haze sits between camera and panel,
   * 0 (at the kerb) to 1 (far down the street). A panel that ignores the haze
   * in the plate reads as being in front of the picture rather than in it.
   */
  haze: number;
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
  to: string;
  accent: Accent;
  sign: SignGeometry;
  /** Interior window view. */
  view: string;
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
    sign: { left: 18.6, top: 24.4, width: 11.6, height: 14.8, skew: -1.5, yaw: 8, haze: 0.45 },
    view: "/media/view-events.webp",
    room: "A control room lined with six screens, one per event.",
  },
  {
    id: "register",
    label: "Register",
    blurb: "Get your school on the list.",
    to: "/register",
    accent: "magenta",
    sign: { left: 67.6, top: 25.4, width: 12.4, height: 14.6, skew: -6.4, yaw: -10, haze: 0.45 },
    view: "/media/view-register.webp",
    room: "A registration terminal facing a window over the city.",
  },
  {
    id: "team",
    label: "Meet the Team",
    blurb: "The students running it.",
    to: "/team",
    accent: "cyan",
    sign: {
      left: 20.6,
      top: 51.2,
      width: 12.9,
      height: 5.9,
      skew: 2.5,
      yaw: 5,
      haze: 0.25,
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
      left: 90.3,
      top: 2.5,
      width: 5.9,
      height: 24.2,
      skew: 0,
      yaw: -14,
      haze: 0.1,
      vertical: true,
    },
    view: "/media/view-resources.webp",
    room: "An archive room with a wall of labelled links.",
  },
];

export function getScene(id: string): Scene | undefined {
  return scenes.find((s) => s.id === id);
}

/** Plate shared by the hub and every phase transition. */
export const crossroadsPlate = {
  webp: "/media/crossroads.webp",
  jpg: "/media/crossroads.jpg",
  width: 1280,
  height: 720,
  alt: "A deserted neon crossroads at night, a full moon centred above the road and lit billboard panels down both sides of the street.",
} as const;

export const descentFilm = {
  src: "/media/descent.mp4",
  poster: "/media/descent-poster.webp",
  width: 1280,
  height: 720,
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

export const faqs = [
  {
    q: "Who can take part in Quantum V2.0?",
    a: "Quantum is an inter-school fest. Students in classes 9 to 12 at any participating school may register, and a school may send more than one team to the same event.",
  },
  {
    q: "Can I enter more than one event?",
    a: "Yes. Enter as many as you can physically attend, but check the schedule first — rounds for different events can run at the same time, and we cannot hold a round for a late team.",
  },
  {
    q: "Is there a registration fee?",
    a: "Registration is handled through the official form. Fee details, if any, are listed on the form and confirmed again in your acceptance email.",
  },
  {
    q: "What should we bring on the day?",
    a: "Your school ID, your confirmation email, and whatever your event needs: cameras and memory cards for Film Making and Ad Shoot, your own peripherals for Online Gaming, a laptop for Pitch.",
  },
  {
    q: "What is the Surprise event?",
    a: "It stays sealed on purpose. The brief, the team size and the rules are announced on the morning of the fest, and it carries the same points weight as every other event.",
  },
  {
    q: "How are winners decided?",
    a: "Every event is scored by an independent panel against published criteria. Event winners take individual trophies, and cumulative points across all six events decide the overall school champion.",
  },
  {
    q: "What happens after I register?",
    a: "You get a confirmation email with your team code, the reporting time for each event you entered, and the campus map. Bring the team code — it is how we check you in.",
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
  lede: "Quantum is the inter-school tech and culture fest run by the students of A.F.S. Bal Bharati School. V2.0 is the second edition, and it is bigger in the only way that matters: more schools in the building, competing on the same day for the same trophy.",
  body: [
    "The format is deliberately simple. Six events run across one day — Quiz, Film Making, Ad Shoot, Online Gaming, Pitch, and one that stays sealed until the morning. Every event is scored the same way and carries the same weight, so a school that is strong in one discipline cannot coast. The cumulative score across all six decides the overall champion.",
    "Everything you see on the day is student-run. Students write the quiz, judge the prelims, cut the highlight reel, manage the brackets, staff the help desk and run the tech. Faculty are there as coordinators and nothing more. That is the point of the fest: not a showcase put on for students, but one put on by them.",
    "We built it for people who want to make something under pressure. Thirty-six hours to shoot a film. Sixty seconds to sell a product you were handed on the spot. Five minutes to defend a business case to a panel that will interrupt you. None of it rewards preparation alone.",
  ],
  /** Pulled out as the page's closing line. */
  kicker: "Bring a team, pick your events, and come find out what you can do with a deadline.",
} as const;

/* ------------------------------------------------------------------ *
 * Contact — TODO, not yet finalised.
 * ------------------------------------------------------------------ */

export const contact = {
  email: `${TODO} — official fest email`,
  phone: `${TODO} — coordinator phone`,
  instagram: `${TODO} — fest Instagram handle`,
  school: school.name,
  address: school.city,
} as const;
