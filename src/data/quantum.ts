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
  lede: "Quantum is the inter-school tech and culture fest run by the students of Air Force Bal Bharati School. V2.0 is the second edition, and it is bigger in the only way that matters: more schools in the building, competing on the same day for the same trophy.",
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
