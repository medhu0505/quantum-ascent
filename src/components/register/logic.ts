import { events, getEvent, type QuantumEvent } from "@/data/quantum";
import { submitEach, type BackendReply, type RegistrationPayload } from "@/lib/registrations";

/**
 * The rules an entry is held to, shared by both register forms: the desktop
 * page's single form and the phone app's four steps. One set of messages, one
 * idea of what a valid phone number is and one way of turning what was typed
 * into what is sent, so an entry means the same thing whichever screen it was
 * typed on.
 *
 * A school registers on one form: whom to write to and call, the teacher
 * in-charge who brings the teams, the events it is entering, and under each of
 * those events, that event's team. Every student on a team has a name, a
 * class and a Discord ID. A student can compete in only one event, so the same
 * student turning up under a second event is caught here rather than at the
 * registration desk.
 */

/**
 * Whom the organisers write to and call about every team on the form, and the
 * school's teacher in-charge, who comes with the teams on the day. The
 * teacher's three are all asked for, and all sent, on every entry.
 */
export type Contact = {
  school: string;
  email: string;
  phone: string;
  teacher: string;
  teacherPhone: string;
  teacherEmail: string;
};

/** `events` is the event checkboxes, which are a list rather than a field. */
export type ContactErrors = Partial<Record<keyof Contact | "events", string>>;

/** The order the fields stand in on the page, which is the order a bad one is found in. */
export const CONTACT_ORDER: (keyof Contact)[] = [
  "school",
  "email",
  "phone",
  "teacher",
  "teacherPhone",
  "teacherEmail",
];

export const EMPTY_CONTACT: Contact = {
  school: "",
  email: "",
  phone: "",
  teacher: "",
  teacherPhone: "",
  teacherEmail: "",
};

/** One place on an event's team. */
export type Player = { name: string; grade: string; discord: string };

export type PlayerErrors = Partial<Record<keyof Player, string>>;

export const PLAYER_ORDER: (keyof Player)[] = ["name", "grade", "discord"];

export const NO_PLAYER: Player = { name: "", grade: "", discord: "" };

/**
 * Every event's team, keyed by event id. An event that is unticked keeps its
 * team here, so ticking it again brings the names back rather than blanks.
 */
export type Teams = Record<string, Player[]>;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Discord IDs have no spaces. Deliberately loose otherwise: Discord has
 *  changed its username rules more than once, and a strict pattern would
 *  reject real accounts. */
export const DISCORD = /^\S{2,37}$/;

export const CLASSES = [9, 10, 11, 12];

/** The longest value the backends take in any one field. */
export const MAX_TEXT = 120;

/**
 * An Indian phone number as ten digits, or null if it is not one.
 *
 * Every entrant is at a school in India, so nobody should need to know or type
 * a country code. People type one anyway, out of habit, so "+91 98100 12345",
 * "91-9810012345", "09810012345" and "9810012345" all come out as the same ten
 * digits. A leading 91 or 0 is only removed when it is what makes the number
 * longer than ten — a real ten-digit number that happens to start 91 is kept.
 *
 * Exactly ten, not "at least ten": an eleventh digit is a typo, and a typo in
 * the one number the organisers call on the day is worth catching here.
 */
export function indianPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export function validateContact(values: Contact, picked: string[]): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.school.trim()) errors.school = "Enter your school's name.";
  if (!values.email.trim()) errors.email = "Enter an email we can send the confirmation to.";
  else if (!EMAIL.test(values.email.trim())) errors.email = "That email address is not valid.";
  if (!values.phone.trim()) errors.phone = "Enter a phone number we can reach during the fest.";
  else if (!indianPhone(values.phone)) errors.phone = "Enter a 10-digit phone number.";
  if (!values.teacher.trim()) errors.teacher = "Enter the teacher in-charge's name.";
  if (!values.teacherPhone.trim())
    errors.teacherPhone = "Enter the teacher in-charge's phone number.";
  else if (!indianPhone(values.teacherPhone))
    errors.teacherPhone = "Enter a 10-digit phone number for the teacher in-charge.";
  if (!values.teacherEmail.trim())
    errors.teacherEmail = "Enter the teacher in-charge's email address.";
  else if (!EMAIL.test(values.teacherEmail.trim()))
    errors.teacherEmail = "The teacher in-charge's email address is not valid.";
  if (picked.length === 0) errors.events = "Choose at least one event to enter.";
  return errors;
}

/**
 * An event's places: exactly as many as it takes, never a number the visitor
 * chooses. The first `size.min` are needed; any past that are optional.
 */
export function places(eventId: string, teams: Teams): Player[] {
  const max = getEvent(eventId)?.size.max ?? 1;
  const have = teams[eventId] ?? [];
  return Array.from({ length: max }, (_, i) => have[i] ?? NO_PLAYER);
}

/** A place, as the form heads it: "Participant 1 · Team lead", "Participant 3 · Optional". */
export function placeLabel(event: QuantumEvent, index: number): string {
  if (event.size.max === 1) return "Participant";
  if (index === 0) return "Participant 1 · Team lead";
  return `Participant ${index + 1}${index >= event.size.min ? " · Optional" : ""}`;
}

/** Whose name a message is asking for, in the words the place is headed with. */
function whose(event: QuantumEvent, index: number): string {
  if (event.size.max === 1) return "the participant's";
  return index === 0 ? "the team lead's" : "this participant's";
}

const filled = (p: Player) => PLAYER_ORDER.some((key) => p[key].trim() !== "");

/** Same student: the same name, however it is spaced or capitalised, in the same class. */
const studentKey = (p: Player) => `${p.name.trim().toLowerCase().replace(/\s+/g, " ")}|${p.grade}`;

/**
 * Every picked event's team, checked against its own size and against the
 * others, in the order the events are listed. A needed place has to be filled
 * in; an optional one is skipped while it is empty and checked like the rest
 * once anything is typed in it. The same student under a second event is
 * flagged where they turn up second.
 */
export function checkTeams(picked: string[], teams: Teams): Record<string, PlayerErrors[]> {
  const seen = new Map<string, string>();
  const out: Record<string, PlayerErrors[]> = {};
  for (const event of events) {
    if (!picked.includes(event.id)) continue;
    out[event.id] = places(event.id, teams).map((p, i) => {
      const e: PlayerErrors = {};
      if (i >= event.size.min && !filled(p)) return e;
      const name = p.name.trim();
      const discord = p.discord.trim();
      if (!name) e.name = `Enter ${whose(event, i)} name.`;
      if (!p.grade) e.grade = `Choose ${whose(event, i)} class.`;
      if (discord && !DISCORD.test(discord))
        e.discord = "A Discord ID has no spaces in it. Check this one.";
      if (name && p.grade) {
        const where = seen.get(studentKey(p));
        if (where === event.name) e.name = "This student is already on this team.";
        else if (where)
          e.name = `Already entered for ${where}. A student can compete in only one event.`;
        else seen.set(studentKey(p), event.name);
      }
      return e;
    });
  }
  return out;
}

/** One problem on a team, where a summary can point at it. */
export type TeamProblem = {
  event: QuantumEvent;
  index: number;
  key: keyof Player;
  message: string;
};

/** Every problem `checkTeams` found, in the order they appear on the page. */
export function teamProblems(checks: Record<string, PlayerErrors[]>): TeamProblem[] {
  return events.flatMap((event) =>
    (checks[event.id] ?? []).flatMap((row, index) =>
      PLAYER_ORDER.filter((key) => row[key]).map((key) => ({
        event,
        index,
        key,
        message: row[key] as string,
      })),
    ),
  );
}

/** "The Q Factor, participant 2", for a summary line that has to say where. */
export function placeName(event: QuantumEvent, index: number): string {
  if (event.size.max === 1) return event.name;
  return `${event.name}, ${index === 0 ? "team lead" : `participant ${index + 1}`}`;
}

/** The names on a team as typed, in place order, for the receipt and the review. */
export function teamNames(eventId: string, teams: Teams): string[] {
  return places(eventId, teams)
    .map((p) => p.name.trim())
    .filter(Boolean);
}

/**
 * One entry per event, as the backend takes them. The contact's email and
 * phone and the teacher in-charge's name, phone and email are every entry's,
 * the first place is its team lead, and the rest are its members, each with a
 * Discord ID. That is the shape both backends have
 * always accepted, so nothing on the server had to change for teams to be
 * split by event. Optional places left empty are dropped, and each entry names
 * exactly one event, so the same email and event always make the same entry
 * and a second submit is recognised as a duplicate.
 */
export function buildPayloads(
  contact: Contact,
  picked: string[],
  teams: Teams,
  website: string,
): RegistrationPayload[] {
  const school = contact.school.trim();
  const email = contact.email.trim();
  const phone = indianPhone(contact.phone) ?? contact.phone.trim();
  const teacher = contact.teacher.trim();
  const teacherPhone = indianPhone(contact.teacherPhone) ?? contact.teacherPhone.trim();
  const teacherEmail = contact.teacherEmail.trim();
  return events
    .filter((event) => picked.includes(event.id))
    .map((event): RegistrationPayload => {
      const team = places(event.id, teams)
        .map((p) => ({ name: p.name.trim(), grade: p.grade, discord: p.discord.trim() }))
        .filter((p) => p.name);
      const [lead = NO_PLAYER, ...rest] = team;
      return {
        type: "school",
        student: lead.name,
        grade: lead.grade,
        discord: lead.discord,
        school,
        email,
        phone,
        teacher,
        teacherPhone,
        teacherEmail,
        events: [event.id],
        members: rest.map((p) => ({
          name: p.name,
          grade: p.grade,
          phone: "",
          discord: p.discord,
          email: "",
        })),
        website,
      };
    });
}

export type Receipt = { id: string; duplicate: boolean };

/** Each event's receipt, once the backend has given it one. */
export type Outcomes = Record<string, Receipt>;

/** An event that did not go through, and why, in words for the visitor. */
export type Failure = { event: string; message: string };

const FIELD_WORDS: Record<string, string> = {
  student: "team lead's name",
  grade: "team lead's class",
  discord: "team lead's Discord ID",
  school: "school",
  email: "email",
  phone: "phone",
  teacher: "teacher in-charge's name",
  teacherPhone: "teacher in-charge's phone",
  teacherEmail: "teacher in-charge's email",
  events: "events",
};

export const OFFLINE =
  "Could not reach the registration server. Check your connection; your answers are still here, so submit again when you are back online.";

export function describeFailure(reply: Extract<BackendReply, { ok: false }>): string {
  if (reply.error === "closed") {
    return "Entries closed while this page was open. Nothing was submitted.";
  }
  if (reply.error === "invalid") {
    return reply.field === "members"
      ? "One of the participants did not pass the server's checks. Check them and submit again."
      : `The ${FIELD_WORDS[reply.field ?? ""] ?? "form"} did not pass the server's checks. Check it and submit again.`;
  }
  return "The registration server could not save this team. Your answers are still here, so try again in a minute.";
}

/**
 * Sends every picked event that has no receipt yet, one entry each, and says
 * how each one went. An event that is already through is never sent again, so
 * submitting after a partial failure sends only the teams that failed.
 */
export async function sendTeams(
  contact: Contact,
  picked: string[],
  teams: Teams,
  outcomes: Outcomes,
  website: string,
): Promise<{ outcomes: Outcomes; failures: Failure[] }> {
  const waiting = picked.filter((id) => !outcomes[id]);
  const replies = await submitEach(buildPayloads(contact, waiting, teams, website));
  const next: Outcomes = { ...outcomes };
  const failures: Failure[] = [];
  for (const { event, reply } of replies) {
    if (reply?.ok) next[event] = { id: reply.id, duplicate: Boolean(reply.duplicate) };
    else failures.push({ event, message: reply ? describeFailure(reply) : OFFLINE });
  }
  return { outcomes: next, failures };
}

/**
 * Everything entered so far.
 *
 * The site swaps between its desktop and phone layouts live: snapping a laptop
 * window to half the screen is enough, and so is turning a tablet. The swap
 * unmounts whichever form was showing. The register route holds this across
 * it and both forms read and write it, so a school's teams survive a swap
 * either way. None of it is stored anywhere, and leaving the page starts the
 * next visit clean.
 */
export type RegisterDraft = {
  contact: Contact;
  picked: string[];
  teams: Teams;
  outcomes: Outcomes;
  /** Every picked event has its receipt, so the receipt is what shows. */
  done: boolean;
  /** The phone form's step. The desktop form is one page and only keeps it. */
  step: number;
};
