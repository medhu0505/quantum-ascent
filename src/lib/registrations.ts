/**
 * Where a registration goes when someone presses submit.
 *
 * Two backends, one contract. Firestore is the primary once the project is
 * configured; the original Apps Script web app stays wired up behind it, both
 * as the fallback for a deployment with no Firebase config and as a mirror so
 * the organisers' Google Sheet keeps filling. The form component knows about
 * neither — it calls `submitRegistration` and reads a `BackendReply`.
 *
 * The reply shape is the Apps Script's, kept deliberately: `{ ok: true, id }`,
 * `{ ok: true, id, duplicate: true }`, or `{ ok: false, error, field? }`. A
 * registration counts as received only when a backend answers with an ID, and
 * there is still no fake success path anywhere below.
 */

import { REGISTRATION_ENDPOINT, events as allEvents, isTodo } from "@/data/quantum";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

export type RegistrationType = "individual" | "school";

export type Participant = {
  name: string;
  grade: string;
  phone: string;
  discord: string;
  email: string;
};

export type RegistrationPayload = {
  type: RegistrationType;
  student: string;
  school: string;
  grade: string;
  email: string;
  phone: string;
  discord: string;
  /** Canonically ordered: the order `events` declares, not the order ticked. */
  events: string[];
  members: Participant[];
  /** Honeypot. Non-empty means a bot filled a field no person can see. */
  website: string;
};

export type BackendReply =
  { ok: true; id: string; duplicate?: boolean } | { ok: false; error: string; field?: string };

export type RegistrationBackend = "firestore" | "apps-script" | null;

/** The only ids an entry may carry, read off the event list so they cannot drift. */
export const EVENT_IDS: readonly string[] = allEvents.map((event) => event.id);

/** Mirrored in firestore.rules. Changing one without the other breaks submits. */
export const MAX_MEMBERS = 5;
export const MAX_FIELD_LENGTH = 120;

const REGISTRATIONS = "registrations";
const SEND_TIMEOUT_MS = 20_000;

/**
 * Firestore first, then the sheet, then nothing.
 *
 * Deliberately not a build-time constant: a deployment can hold both configs,
 * and which one is live should be answerable by reading this function rather
 * than by diffing two environments.
 */
export function registrationBackend(): RegistrationBackend {
  if (isFirebaseConfigured()) return "firestore";
  if (REGISTRATION_ENDPOINT && !isTodo(REGISTRATION_ENDPOINT)) return "apps-script";
  return null;
}

export function isRegistrationOpen(): boolean {
  return registrationBackend() !== null;
}

/** True when an accepted Firestore entry should also be pushed to the sheet. */
function mirrorsToSheet(): boolean {
  if (registrationBackend() !== "firestore") return false;
  if (!REGISTRATION_ENDPOINT || isTodo(REGISTRATION_ENDPOINT)) return false;
  return import.meta.env["VITE_REGISTRATION_MIRROR"] !== "false";
}

/* ------------------------------------------------------------------ *
 * Identity
 *
 * A registration's document id is SHA-256 of the lead's lowercased email and
 * the chosen events, and the visible id is the first eight hex digits of that
 * hash. One derivation, three jobs: it is the primary key, so a resubmit of
 * the same entry lands on the same document and Firestore's own create
 * semantics reject it without a read; it is checked inside the rules, so the
 * one-entry-per-email-per-event-set limit is enforced on the server rather
 * than politely observed by the client; and it makes the visible id
 * recoverable, so a duplicate can be answered with the original id having
 * read nothing at all.
 *
 * That last property is also the trade: anyone who knows an entrant's email
 * and guesses their events can compute their registration id offline. The
 * Apps Script has the same exposure by a different route — POST a matching
 * email and event set and it hands back the original id — so this is the
 * existing posture, not a new hole. The id identifies a registration at the
 * desk; it has never authenticated anything.
 * ------------------------------------------------------------------ */

function requireWebCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    // Only reachable over plain http on a non-localhost host, where
    // window.isSecureContext is false and crypto.subtle is not defined.
    throw new Error("Registration needs a secure context (https or localhost).");
  }
  return subtle;
}

export async function registrationKey(email: string, events: string[]): Promise<string> {
  const input = `${email.trim().toLowerCase()}|${events.join(",")}`;
  const digest = await requireWebCrypto().digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function registrationIdFromKey(key: string): string {
  return `QV2-${key.slice(0, 8).toUpperCase()}`;
}

/* ------------------------------------------------------------------ *
 * Validation
 *
 * The same checks the form runs and the same checks firestore.rules runs,
 * expressed a third time here because `submitRegistration` is also reachable
 * from code that never rendered the form. Failing here costs nothing; failing
 * in the rules costs a round trip and surfaces as a bare permission error.
 * ------------------------------------------------------------------ */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISCORD = /^\S{2,37}$/;
const CLASSES = ["9", "10", "11", "12"];
const TYPES: RegistrationType[] = ["individual", "school"];

function digits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function tooLong(value: string): boolean {
  return value.length > MAX_FIELD_LENGTH;
}

/** The offending field name, or null when the payload is sound. */
function firstProblem(payload: RegistrationPayload): string | null {
  if (!TYPES.includes(payload.type)) return "type";
  if (!payload.student || tooLong(payload.student)) return "student";
  if (!payload.school || tooLong(payload.school)) return "school";
  if (!CLASSES.includes(payload.grade)) return "grade";
  if (!EMAIL.test(payload.email) || tooLong(payload.email)) return "email";
  if (digits(payload.phone) < 10 || tooLong(payload.phone)) return "phone";
  if (payload.discord && !DISCORD.test(payload.discord)) return "discord";

  // Canonical: the declared order, no repeats, nothing unknown. The document
  // id is a hash of this list, so a reordered or repeated list would hash to a
  // different key and slip past the duplicate check.
  const canonical = EVENT_IDS.filter((id) => payload.events.includes(id));
  if (canonical.length === 0) return "events";
  if (canonical.length !== payload.events.length) return "events";
  if (canonical.some((id, i) => payload.events[i] !== id)) return "events";

  if (payload.members.length > MAX_MEMBERS) return "members";
  for (const member of payload.members) {
    if (!member.name || tooLong(member.name)) return "members";
    if (member.grade && !CLASSES.includes(member.grade)) return "members";
    if (member.email && !EMAIL.test(member.email)) return "members";
    if (member.phone && digits(member.phone) < 10) return "members";
    if (member.discord && !DISCORD.test(member.discord)) return "members";
    if ([member.grade, member.phone, member.discord, member.email].some(tooLong)) return "members";
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Backends
 * ------------------------------------------------------------------ */

/**
 * Apps Script cannot answer a CORS preflight, so the body goes as text/plain,
 * which keeps this a "simple" request. The script parses it as JSON.
 */
async function submitToAppsScript(payload: RegistrationPayload): Promise<BackendReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(REGISTRATION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: `http_${response.status}` };
    return (await response.json()) as BackendReply;
  } finally {
    clearTimeout(timer);
  }
}

/** Firestore lite takes no abort signal, so the timeout is a race. */
async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("registration_timeout")), SEND_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function errorCode(error: unknown): string {
  if (error != null && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

async function submitToFirestore(payload: RegistrationPayload): Promise<BackendReply> {
  const key = await registrationKey(payload.email, payload.events);
  const id = registrationIdFromKey(key);

  const [db, { doc, setDoc, serverTimestamp }] = await Promise.all([
    getDb(),
    import("firebase/firestore/lite"),
  ]);

  const record = {
    id,
    type: payload.type,
    student: payload.student,
    school: payload.school,
    grade: payload.grade,
    email: payload.email,
    // Firestore compares strings byte for byte, so the organisers' "find this
    // entrant" query needs a folded copy to match against.
    emailLower: payload.email.toLowerCase(),
    phone: payload.phone,
    discord: payload.discord,
    events: payload.events,
    members: payload.members,
    teamSize: payload.members.length + 1,
    createdAt: serverTimestamp(),
  };

  try {
    await withTimeout(setDoc(doc(db, REGISTRATIONS, key), record));
    return { ok: true, id };
  } catch (error) {
    const code = errorCode(error);

    // The rules allow create and deny update, so writing over an existing
    // document is a permission error rather than an "already exists" one.
    // Everything in `record` was checked against those same rules a few lines
    // above, which leaves the document already being there as the explanation.
    // If the two validations ever drift, this reads a rejected entry as a
    // duplicate — so they are kept in one place and tested against the
    // emulator rather than trusted to stay in step.
    if (code === "permission-denied") return { ok: true, id, duplicate: true };

    // Transport failures are rethrown so they land in the caller's offline
    // path, the same way a failed fetch does.
    if (code === "unavailable" || code === "deadline-exceeded") throw error;
    if (error instanceof Error && error.message === "registration_timeout") throw error;

    console.error("registration write failed", error);
    return { ok: false, error: "server" };
  }
}

/**
 * Best-effort copy into the Google Sheet. Never awaited by the caller and
 * never able to fail a registration that Firestore already accepted — the
 * same rule the Apps Script applies to its own per-school tab. The script
 * dedupes on email and events, so a mirror of a duplicate adds no row.
 */
function mirrorToSheet(payload: RegistrationPayload, id: string): void {
  void submitToAppsScript({ ...payload, id } as RegistrationPayload & { id: string }).catch(
    (error: unknown) => {
      console.warn("sheet mirror failed", error);
    },
  );
}

/**
 * Submit one registration.
 *
 * Throws on transport failure, returns a reply for anything a backend
 * actually answered. Callers treat a throw as "could not reach the server,
 * your answers are still here".
 */
export async function submitRegistration(payload: RegistrationPayload): Promise<BackendReply> {
  // The honeypot is answered before anything is written, not after. A bot gets
  // the same shape of success a person gets and nothing reaches the database.
  if (payload.website) return { ok: true, id: "QV2-RECEIVED" };

  const backend = registrationBackend();
  if (backend === null) return { ok: false, error: "closed" };

  const field = firstProblem(payload);
  if (field) return { ok: false, error: "invalid", field };

  if (backend === "apps-script") return submitToAppsScript(payload);

  const reply = await submitToFirestore(payload);
  if (reply.ok && mirrorsToSheet()) mirrorToSheet(payload, reply.id);
  return reply;
}
