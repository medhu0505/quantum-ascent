import { events } from "@/data/quantum";
import type { BackendReply, Participant, RegistrationPayload } from "@/lib/registrations";

/**
 * The rules an entry is held to, shared by both register forms: the desktop
 * page's single form and the phone app's four steps. One set of messages, one
 * payload, one idea of what a valid phone number is, so an entry means the
 * same thing whichever screen it was typed on.
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

export const MEMBER_LABEL: Record<keyof Participant, string> = {
  name: "Full name",
  grade: "Class",
  phone: "Phone",
  discord: "Discord",
  email: "Email",
};

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
