/**
 * Single source of truth for all Quantum V2.0 content.
 * Anything marked TODO_PLACEHOLDER must be replaced with real data before launch.
 */

export const TODO_BROCHURE_URL = "#TODO-brochure-url"; // TODO: replace with the real brochure/registration URL

export type EventRouting =
  | { mode: "brochure"; target: string }
  | { mode: "internal-page"; target: string };

export type QuantumEvent = {
  id: string;
  name: string;
  tagline: string;
  team: string;
  description: string;
  format: string[];
  accent: "cyan" | "magenta" | "violet";
  routing: EventRouting;
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
    routing: { mode: "brochure", target: TODO_BROCHURE_URL },
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
    routing: { mode: "brochure", target: TODO_BROCHURE_URL },
  },
  {
    id: "ad-shoot",
    name: "Ad Shoot",
    tagline: "Sixty seconds to sell the impossible.",
    team: "Team of 2–4",
    description:
      "You get an absurd product and one minute of screen time. Write it, shoot it, perform it. Judged on the idea first, polish second — the funniest concept usually wins the room.",
    format: [
      "Product assigned on the spot",
      "60-second ad, live or filmed",
      "Scored on concept, delivery and edit",
    ],
    accent: "violet",
    routing: { mode: "brochure", target: TODO_BROCHURE_URL },
  },
  {
    id: "surprise",
    name: "Surprise",
    tagline: "Classified until the doors open.",
    team: "Announced day-of",
    description:
      "One event stays sealed. The challenge, the team size and the rules are revealed only on the morning of the fest. Bring a general kit: laptop, pens, paper and nerve.",
    format: [
      "Brief revealed on fest day",
      "Registration opens the same morning",
      "Same points weight as every other event",
    ],
    accent: "cyan",
    routing: { mode: "brochure", target: TODO_BROCHURE_URL },
  },
  {
    id: "online-gaming",
    name: "Online Gaming",
    tagline: "Ladder up. Last squad standing.",
    team: "Solo or squad",
    description:
      "Bracketed LAN and online tournaments across a solo title and a squad title. Seeded qualifiers run through the morning, finals are cast live on the main screen.",
    format: [
      "Seeded double-elimination bracket",
      "Own peripherals allowed, no external comms",
      "Finals streamed to the main hall",
    ],
    accent: "magenta",
    routing: { mode: "brochure", target: TODO_BROCHURE_URL },
  },
  {
    id: "pitch",
    name: "Pitch",
    tagline: "Five minutes in front of the money.",
    team: "Team of 2–3",
    description:
      "Build a startup case around a real problem and defend it. Five minutes to pitch, three to survive questions from the panel. Slides optional, numbers are not.",
    format: [
      "5-minute pitch, 3-minute grilling",
      "Problem, solution, market, model",
      "Deck submitted before the round",
    ],
    accent: "violet",
    routing: { mode: "brochure", target: TODO_BROCHURE_URL },
  },
];

/** Hologram anchor points over the ad panels, keyed to video time (seconds). */
export type Keyframe = { t: number; x: number; y: number; s: number };

export const hologramKeyframes: Record<string, Keyframe[]> = {
  quiz: [
    { t: 2.0, x: 34, y: 34, s: 0.72 },
    { t: 3.1, x: 28, y: 28, s: 1.0 },
    { t: 4.3, x: 16, y: 14, s: 1.5 },
  ],
  "film-making": [
    { t: 2.0, x: 31, y: 60, s: 0.72 },
    { t: 3.1, x: 23, y: 57, s: 1.05 },
    { t: 4.3, x: 8, y: 48, s: 1.55 },
  ],
  "ad-shoot": [
    { t: 2.0, x: 44, y: 76, s: 0.68 },
    { t: 3.1, x: 41, y: 81, s: 0.95 },
    { t: 4.3, x: 33, y: 90, s: 1.4 },
  ],
  surprise: [
    { t: 2.0, x: 63, y: 33, s: 0.72 },
    { t: 3.1, x: 69, y: 28, s: 1.0 },
    { t: 4.3, x: 83, y: 14, s: 1.5 },
  ],
  "online-gaming": [
    { t: 2.0, x: 68, y: 60, s: 0.72 },
    { t: 3.1, x: 75, y: 57, s: 1.05 },
    { t: 4.3, x: 91, y: 48, s: 1.55 },
  ],
  pitch: [
    { t: 2.0, x: 58, y: 78, s: 0.68 },
    { t: 3.1, x: 62, y: 83, s: 0.95 },
    { t: 4.3, x: 70, y: 91, s: 1.4 },
  ],
};

/**
 * Timing windows measured from the supplied film (actual duration ~8.0s):
 * aerial moon/skyline, descent through the neon canyon of ad panels,
 * street level, then a drop into the lit sewer tunnel.
 */
export const timeline = {
  duration: 8.0,
  aerial: [0, 1.9] as const,
  holograms: [1.9, 4.4] as const,
  street: [4.2, 5.1] as const,
  sewer: [5.3, 8.0] as const,
};


export type TeamMember = { name: string; role: string; placeholder?: boolean };

/** TODO: roster not finalised — replace every placeholder entry below. */
export const team: TeamMember[] = [
  { name: "TODO — name", role: "Fest Head", placeholder: true },
  { name: "TODO — name", role: "Deputy Fest Head", placeholder: true },
  { name: "TODO — name", role: "Events Lead", placeholder: true },
  { name: "TODO — name", role: "Tech Lead", placeholder: true },
  { name: "TODO — name", role: "Design Lead", placeholder: true },
  { name: "TODO — name", role: "Media & Coverage", placeholder: true },
  { name: "TODO — name", role: "Hospitality", placeholder: true },
  { name: "TODO — name", role: "Faculty Coordinator", placeholder: true },
];

export const faqs = [
  {
    q: "Who can participate in Quantum V2.0?",
    a: "Quantum is an inter-school fest. Students from classes 9 to 12 of any participating school may register, and a school may send more than one team per event.",
  },
  {
    q: "Can I register for more than one event?",
    a: "Yes. You can enter as many events as you can physically attend — just check the schedule, because rounds for different events can overlap on the day.",
  },
  {
    q: "Is there a registration fee?",
    a: "Registration is handled through the official brochure form. Fee details, if any, are listed there and confirmed in your acceptance email.",
  },
  {
    q: "What should we bring?",
    a: "Your school ID, the confirmation email, and any gear your event needs — cameras and cards for Film Making and Ad Shoot, peripherals for Online Gaming, a laptop for Pitch.",
  },
  {
    q: "What is the Surprise event?",
    a: "It stays sealed on purpose. The brief, team size and rules are announced on the morning of the fest, and it carries the same points weight as every other event.",
  },
  {
    q: "How are winners decided?",
    a: "Every event is scored by an independent panel using published criteria. Event winners take individual trophies, and cumulative points across all six events decide the overall school champion.",
  },
];

/** TODO: contact details not finalised. */
export const contact = {
  email: "TODO — add official fest email",
  phone: "TODO — add coordinator phone",
  school: "Air Force Bal Bharati School",
  address: "Lodhi Road, New Delhi",
};
