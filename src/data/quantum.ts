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
    { t: 4.8, x: 33, y: 32, s: 0.75 },
    { t: 6.6, x: 30, y: 27, s: 1 },
    { t: 8.4, x: 21, y: 15, s: 1.45 },
  ],
  "film-making": [
    { t: 4.8, x: 32, y: 62, s: 0.75 },
    { t: 6.6, x: 25, y: 58, s: 1.05 },
    { t: 8.4, x: 10, y: 49, s: 1.5 },
  ],
  "ad-shoot": [
    { t: 4.8, x: 45, y: 78, s: 0.7 },
    { t: 6.6, x: 42, y: 82, s: 0.95 },
    { t: 8.4, x: 35, y: 89, s: 1.35 },
  ],
  surprise: [
    { t: 4.8, x: 62, y: 35, s: 0.75 },
    { t: 6.6, x: 66, y: 30, s: 1 },
    { t: 8.4, x: 78, y: 18, s: 1.45 },
  ],
  "online-gaming": [
    { t: 4.8, x: 66, y: 60, s: 0.75 },
    { t: 6.6, x: 72, y: 58, s: 1.05 },
    { t: 8.4, x: 89, y: 50, s: 1.5 },
  ],
  pitch: [
    { t: 4.8, x: 60, y: 80, s: 0.7 },
    { t: 6.6, x: 63, y: 84, s: 0.95 },
    { t: 8.4, x: 72, y: 91, s: 1.35 },
  ],
};

/**
 * Timing windows measured from the supplied film (actual duration ~10.05s).
 * The brief described the same beats across 30s; they are proportionally
 * compressed here to match the real file.
 */
export const timeline = {
  duration: 10.05,
  aerial: [0, 4.4] as const,
  holograms: [4.6, 8.6] as const,
  street: [8.0, 9.0] as const,
  grate: [8.9, 10.05] as const,
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
