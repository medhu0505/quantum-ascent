import { events, getEvent } from "@/data/quantum";
import type { BackendReply, Participant, RegistrationPayload } from "@/lib/registrations";

/**
 * The rules an entry is held to, for both register forms.
 *
 * The phone app's four steps register one team with a lead: Fields,
 * validate() and buildPayload() below. The desktop form registers a school:
 * its Teacher In-Charge, then a team for each event, each checked against
 * that event's own size. That is the second half of this file. Both share
 * one set of messages and one idea of what a valid phone number or email is.
 */

export type Fields = {
  student: string;
  school: string;
  grade: string;
  email: string;
  phone: string;
  discord: string;
};

/** `events` is not a Fields key — it is the checkbox group, which is a list. */
export type Errors = Partial<Record<keyof Fields | "events", string>>;
export type MemberErrors = Partial<Record<keyof Participant, string>>;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Handles have no spaces. Deliberately loose otherwise — Discord has changed
 *  its username rules more than once and a strict pattern would reject real
 *  accounts. */
export const DISCORD = /^\S{2,37}$/;

export const CLASSES = [9, 10, 11, 12];

export const BLANK: Participant = { name: "", grade: "", phone: "", discord: "", email: "" };

/** A row nobody has touched is not an error, it is an empty row. */
export function used(m: Participant): boolean {
  return Object.values(m).some((v) => v.trim() !== "");
}

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

export function validate(values: Fields, picked: string[]): Errors {
  const errors: Errors = {};
  if (!values.student.trim()) errors.student = "Enter the name of the team lead.";
  if (!values.school.trim()) errors.school = "Enter your school's name.";
  if (!values.grade) errors.grade = "Choose the team lead's class.";
  if (!values.email.trim()) errors.email = "Enter an email we can send the confirmation to.";
  else if (!EMAIL.test(values.email.trim())) errors.email = "That email address is not valid.";
  if (!values.phone.trim()) errors.phone = "Enter a phone number we can reach during the fest.";
  else if (!indianPhone(values.phone)) errors.phone = "Enter a 10-digit phone number.";
  if (values.discord.trim() && !DISCORD.test(values.discord.trim()))
    errors.discord = "A Discord handle has no spaces in it — check this one.";
  if (picked.length === 0) errors.events = "Choose at least one event to enter.";
  return errors;
}

/** Rows left blank are skipped; a row with anything in it needs a name. */
export function validateMembers(list: Participant[]): MemberErrors[] {
  return list.map((m) => {
    const e: MemberErrors = {};
    if (!used(m)) return e;
    if (!m.name.trim()) e.name = "Enter this member's name, or clear the row.";
    if (m.email.trim() && !EMAIL.test(m.email.trim())) e.email = "That email address is not valid.";
    if (m.phone.trim() && !indianPhone(m.phone)) e.phone = "Enter a 10-digit phone number.";
    if (m.discord.trim() && !DISCORD.test(m.discord.trim()))
      e.discord = "A Discord handle has no spaces in it — check this one.";
    return e;
  });
}

export const FIELD_ORDER: (keyof Fields)[] = [
  "student",
  "school",
  "grade",
  "email",
  "phone",
  "discord",
];

export const MEMBER_ORDER: (keyof Participant)[] = ["name", "grade", "phone", "discord", "email"];

export type Receipt = { id: string; duplicate: boolean };

export function describeFailure(reply: Extract<BackendReply, { ok: false }>): string {
  if (reply.error === "closed") {
    return "Entries closed while this page was open. Nothing was submitted.";
  }
  if (reply.error === "invalid") {
    return reply.field === "members"
      ? "One of the team member rows did not pass the server's checks. Check them and submit again."
      : `The ${reply.field ?? "form"} field did not pass the server's checks. Check it and submit again.`;
  }
  return "The registration server could not save this entry. Your answers are still here, so try again in a minute.";
}

/**
 * The entry as it goes to the backend: trimmed, phone numbers reduced to their
 * ten digits so the sheet the organisers dial from reads one way, blank team
 * rows dropped, and the events in the order they are listed rather than the
 * order they were ticked, so the same set always arrives as the same string
 * and the backend's one-entry-per-team check can compare them.
 */
export function buildPayload(
  values: Fields,
  picked: string[],
  members: Participant[],
  website: string,
): RegistrationPayload {
  const trimmed = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v.trim()]),
  ) as Fields;
  trimmed.phone = indianPhone(trimmed.phone) ?? trimmed.phone;
  const team = members
    .filter(used)
    .map((m) => Object.fromEntries(MEMBER_ORDER.map((k) => [k, m[k].trim()])) as Participant)
    .map((m) => (m.phone ? { ...m, phone: indianPhone(m.phone) ?? m.phone } : m));
  const chosen = events.filter((ev) => picked.includes(ev.id)).map((ev) => ev.id);
  return { ...trimmed, type: "individual", events: chosen, members: team, website };
}

/* ------------------------------------------------------------------ *
 * The desktop form: a school's Teacher In-Charge, and a team per event.
 * ------------------------------------------------------------------ */

export type TeacherFields = { teacher: string; school: string; phone: string; email: string };

/** `events` is the checkbox group on the same step. */
export type TeacherErrors = Partial<Record<keyof TeacherFields | "events", string>>;

export const TEACHER_ORDER: (keyof TeacherFields)[] = ["teacher", "school", "phone", "email"];

export function validateTeacher(values: TeacherFields, picked: string[]): TeacherErrors {
  const errors: TeacherErrors = {};
  if (!values.teacher.trim()) errors.teacher = "Enter the Teacher In-Charge's name.";
  if (!values.school.trim()) errors.school = "Enter your school's name.";
  if (!values.phone.trim()) errors.phone = "Enter the Teacher In-Charge's phone number.";
  else if (!indianPhone(values.phone)) errors.phone = "Enter a 10-digit phone number.";
  if (!values.email.trim()) errors.email = "Enter an email we can send the confirmation to.";
  else if (!EMAIL.test(values.email.trim())) errors.email = "That email address is not valid.";
  if (picked.length === 0) errors.events = "Choose at least one event to enter.";
  return errors;
}

/** One place in an event's team. */
export type Student = { name: string; grade: string };

export const NO_STUDENT: Student = { name: "", grade: "" };

/**
 * Every event's team, keyed by event id. An event that is unticked keeps its
 * team here, so ticking it again brings the names back rather than blanks.
 */
export type Teams = Record<string, Student[]>;

/** An event's places: exactly as many as it takes, never a number the visitor chooses. */
export function places(eventId: string, teams: Teams): Student[] {
  const max = getEvent(eventId)?.size.max ?? 1;
  const have = teams[eventId] ?? [];
  return Array.from({ length: max }, (_, i) => have[i] ?? NO_STUDENT);
}

export type StudentErrors = Partial<Record<keyof Student, string>>;

export type TeamCheck = {
  /** Problems with each place, in place order. */
  places: StudentErrors[];
  /** Students still needed before the event has its minimum. */
  short: number;
  /** Enough students, and nothing wrong with any of them. */
  done: boolean;
};

/** Same student: the same name, however it is spaced or capitalised, in the same class. */
const studentKey = (s: Student) => `${s.name.trim().toLowerCase().replace(/\s+/g, " ")}|${s.grade}`;

/**
 * Every picked event's team, checked against its own size and against the
 * others. A student can compete in only one event, so the same name in the
 * same class turning up a second time is flagged where it turns up second,
 * in the order the events are listed.
 */
export function checkTeams(picked: string[], teams: Teams): Record<string, TeamCheck> {
  const seen = new Map<string, string>();
  const out: Record<string, TeamCheck> = {};
  for (const event of events) {
    if (!picked.includes(event.id)) continue;
    let count = 0;
    const errors = places(event.id, teams).map((s) => {
      const e: StudentErrors = {};
      const name = s.name.trim();
      if (!name && !s.grade) return e;
      if (!name) e.name = "Enter this student's name, or clear the class.";
      if (!s.grade) e.grade = "Choose this student's class.";
      if (name && s.grade) {
        const where = seen.get(studentKey(s));
        if (where === event.name) e.name = "This student is already in this team.";
        else if (where)
          e.name = `Already entered for ${where}. A student can compete in only one event.`;
        else {
          seen.set(studentKey(s), event.name);
          count += 1;
        }
      }
      return e;
    });
    const short = Math.max(0, event.size.min - count);
    out[event.id] = {
      places: errors,
      short,
      done: short === 0 && errors.every((e) => !e.name && !e.grade),
    };
  }
  return out;
}

/** "Please select 1 more participant for this event." */
export function shortBy(short: number): string {
  return `Please select ${short} more participant${short === 1 ? "" : "s"} for this event.`;
}

/**
 * One entry per event, as the backend takes them. The teacher's email and
 * phone are each entry's contact and the first student is its lead, which is
 * the shape the database has always accepted; the teacher's name rides along
 * as `teacher`. Places left empty are dropped, and the events go in the
 * order they are listed, so the same school and event always make the same
 * entry and a second submit is recognised as a duplicate.
 */
export function buildTeamPayloads(
  values: TeacherFields,
  picked: string[],
  teams: Teams,
  website: string,
): RegistrationPayload[] {
  const teacher = values.teacher.trim();
  const school = values.school.trim();
  const email = values.email.trim();
  const phone = indianPhone(values.phone) ?? values.phone.trim();
  return events
    .filter((event) => picked.includes(event.id))
    .map((event) => {
      const team = places(event.id, teams)
        .map((s) => ({ name: s.name.trim(), grade: s.grade }))
        .filter((s) => s.name && s.grade);
      const [lead = NO_STUDENT, ...rest] = team;
      return {
        type: "school",
        teacher,
        student: lead.name,
        grade: lead.grade,
        school,
        email,
        phone,
        discord: "",
        events: [event.id],
        members: rest.map((s) => ({
          name: s.name,
          grade: s.grade,
          phone: "",
          discord: "",
          email: "",
        })),
        website,
      };
    });
}
