import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/site/PageShell";
import { REGISTRATION_FORM_URL, events, isTodo } from "@/data/quantum";
import { seo } from "@/lib/seo";

/**
 * The registration form.
 *
 * One form covers every event; the event selector is the only branch. It is
 * built as plain controlled state rather than a form library so the error
 * wiring — aria-invalid, aria-describedby, focus on the first bad field,
 * a live region for the summary — is explicit and testable.
 *
 * Submission deliberately has no fake success path. Until the organisers
 * supply REGISTRATION_FORM_URL the form validates, keeps the visitor's
 * input, and says plainly that entries are not open yet. Accepting a
 * registration that goes nowhere is worse than not accepting one.
 */

type Search = { event?: string | undefined };

export const Route = createFileRoute("/register/form")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    event:
      typeof search["event"] === "string" && events.some((e) => e.id === search["event"])
        ? (search["event"] as string)
        : undefined,
  }),
  head: () =>
    seo({
      title: "Register",
      description:
        "Enter your school for Quantum V2.0. One form, every event: team details, contact and event selection.",
      path: "/register/form",
    }),
  component: RegisterForm,
});

type Fields = {
  student: string;
  school: string;
  grade: string;
  email: string;
  phone: string;
  discord: string;
  event: string;
};

/**
 * One of the other people on the team. The lead is entered above and is
 * participant one, so these start at two.
 *
 * This replaced a single free-text box that asked for "one name and class per
 * line". That reads fine and collects nothing usable: no way to reach anyone
 * but the lead, and a pile of lines to retype before the fest can be run.
 */
type Participant = {
  name: string;
  grade: string;
  phone: string;
  discord: string;
  email: string;
};

type Errors = Partial<Record<keyof Fields, string>>;
type MemberErrors = Partial<Record<keyof Participant, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Handles have no spaces. Deliberately loose otherwise — Discord has changed
 *  its username rules more than once and a strict pattern would reject real
 *  accounts. */
const DISCORD = /^\S{2,37}$/;

const CLASSES = [9, 10, 11, 12];

/** How many other members a team may list. The largest event is a team of 3. */
const MAX_MEMBERS = 5;

const BLANK: Participant = { name: "", grade: "", phone: "", discord: "", email: "" };

/** A row nobody has touched is not an error, it is an empty row. */
function used(m: Participant): boolean {
  return Object.values(m).some((v) => v.trim() !== "");
}

function phoneShort(value: string): boolean {
  return value.replace(/\D/g, "").length < 10;
}

function validate(values: Fields): Errors {
  const errors: Errors = {};
  if (!values.student.trim()) errors.student = "Enter the name of the team lead.";
  if (!values.school.trim()) errors.school = "Enter your school's name.";
  if (!values.grade) errors.grade = "Choose the team lead's class.";
  if (!values.email.trim()) errors.email = "Enter an email we can send the confirmation to.";
  else if (!EMAIL.test(values.email.trim())) errors.email = "That email address is not valid.";
  if (!values.phone.trim()) errors.phone = "Enter a phone number we can reach on the day.";
  else if (phoneShort(values.phone))
    errors.phone = "Enter a full phone number, including the area or country code.";
  if (values.discord.trim() && !DISCORD.test(values.discord.trim()))
    errors.discord = "A Discord handle has no spaces in it — check this one.";
  if (!values.event) errors.event = "Choose the event you are entering.";
  return errors;
}

/** Rows left blank are skipped; a row with anything in it needs a name. */
function validateMembers(list: Participant[]): MemberErrors[] {
  return list.map((m) => {
    const e: MemberErrors = {};
    if (!used(m)) return e;
    if (!m.name.trim()) e.name = "Enter this member's name, or clear the row.";
    if (m.email.trim() && !EMAIL.test(m.email.trim())) e.email = "That email address is not valid.";
    if (m.phone.trim() && phoneShort(m.phone)) e.phone = "Enter a full phone number.";
    if (m.discord.trim() && !DISCORD.test(m.discord.trim()))
      e.discord = "A Discord handle has no spaces in it — check this one.";
    return e;
  });
}

const FIELD_ORDER: (keyof Fields)[] = [
  "student",
  "school",
  "grade",
  "email",
  "phone",
  "discord",
  "event",
];

const MEMBER_ORDER: (keyof Participant)[] = ["name", "grade", "phone", "discord", "email"];

const MEMBER_LABEL: Record<keyof Participant, string> = {
  name: "Full name",
  grade: "Class",
  phone: "Phone",
  discord: "Discord",
  email: "Email",
};

function RegisterForm() {
  const { event: preselected } = Route.useSearch();
  const registrationOpen = !isTodo(REGISTRATION_FORM_URL);

  const [values, setValues] = useState<Fields>({
    student: "",
    school: "",
    grade: "",
    email: "",
    phone: "",
    discord: "",
    event: preselected ?? "",
  });
  const [members, setMembers] = useState<Participant[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [memberErrors, setMemberErrors] = useState<MemberErrors[]>([]);
  /** Focus lands on a newly added row so the keyboard does not have to walk to it. */
  const focusRow = useRef<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  /** Set once the form validates while entries are still closed. */
  const [checked, setChecked] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const checkedRef = useRef<HTMLParagraphElement | null>(null);

  const set =
    (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      setChecked(false);
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

  const setMember =
    (index: number, key: keyof Participant) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const next = e.target.value;
      setMembers((list) => list.map((m, i) => (i === index ? { ...m, [key]: next } : m)));
      setChecked(false);
      setMemberErrors((prev) =>
        prev[index]?.[key]
          ? prev.map((row, i) => (i === index ? { ...row, [key]: undefined } : row))
          : prev,
      );
    };

  const addMember = () => {
    if (members.length >= MAX_MEMBERS) return;
    focusRow.current = members.length;
    setMembers((list) => [...list, { ...BLANK }]);
    setMemberErrors((prev) => [...prev, {}]);
    setChecked(false);
  };

  const removeMember = (index: number) => {
    setMembers((list) => list.filter((_, i) => i !== index));
    setMemberErrors((prev) => prev.filter((_, i) => i !== index));
    setChecked(false);
  };

  useEffect(() => {
    const row = focusRow.current;
    if (row === null) return;
    focusRow.current = null;
    formRef.current?.querySelector<HTMLElement>(`#field-member-${row}-name`)?.focus();
  }, [members.length]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    const foundMembers = validateMembers(members);
    setErrors(found);
    setMemberErrors(foundMembers);
    setSubmitted(true);

    const firstBad = FIELD_ORDER.find((key) => found[key]);
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    const badRow = foundMembers.findIndex((row) => MEMBER_ORDER.some((k) => row[k]));
    if (badRow >= 0) {
      const key = MEMBER_ORDER.find((k) => foundMembers[badRow]?.[k]);
      formRef.current
        ?.querySelector<HTMLElement>(`#field-member-${badRow}-${String(key)}`)
        ?.focus();
      return;
    }

    if (registrationOpen) {
      // The organisers' form is the system of record; hand off with the
      // answers we already have so nothing is retyped.
      const url = new URL(REGISTRATION_FORM_URL);
      for (const [k, v] of Object.entries(values)) url.searchParams.set(k, v);
      // Flattened one key per person: the lead is participant 1, so the rows
      // below start at 2. Most form backends take prefill as flat keys.
      members.filter(used).forEach((m, i) => {
        const n = i + 2;
        for (const key of MEMBER_ORDER) {
          if (m[key].trim())
            url.searchParams.set(
              `participant${n}${MEMBER_LABEL[key].replace(/\s/g, "")}`,
              m[key].trim(),
            );
        }
      });
      window.location.href = url.toString();
      return;
    }

    // Entries are not open, so there is nothing to submit to — but the form
    // still reports whether what has been typed would pass. Disabling the
    // button instead would make the notice above a lie.
    setChecked(true);
    window.requestAnimationFrame(() => checkedRef.current?.focus());
  };

  const errorList = FIELD_ORDER.filter((k) => errors[k]);
  const memberErrorList = memberErrors.flatMap((row, i) =>
    MEMBER_ORDER.filter((k) => row[k]).map((k) => ({ row: i, key: k, message: row[k] as string })),
  );
  const problems = errorList.length + memberErrorList.length;

  return (
    <PageShell
      title="Register"
      lede="One form covers every event. Enter the team lead's details, pick what you are entering, and list the rest of the team."
    >
      {!registrationOpen ? (
        <p className="notice notice-todo" role="status">
          <span className="todo">
            <span aria-hidden="true">⚠</span> Entries are not open yet
          </span>
          <span>
            The entry form is still being finalised. Fill this in and choose{" "}
            <strong>Check my details</strong> to confirm you have everything ready, then come back
            and submit once entries open.
          </span>
        </p>
      ) : null}

      <form ref={formRef} className="form" onSubmit={onSubmit} noValidate>
        {submitted && problems > 0 ? (
          <div className="form-summary" role="alert" tabIndex={-1}>
            <p className="form-summary-title">
              {problems === 1 ? "One field needs fixing" : `${problems} fields need fixing`}
            </p>
            <ul>
              {errorList.map((key) => (
                <li key={key}>
                  <a href={`#field-${key}`}>{errors[key]}</a>
                </li>
              ))}
              {memberErrorList.map(({ row, key, message }) => (
                <li key={`${row}-${key}`}>
                  <a href={`#field-member-${row}-${key}`}>
                    Member {row + 2}: {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Field
          id="student"
          label="Team lead's full name"
          error={errors.student}
          value={values.student}
          onChange={set("student")}
          autoComplete="name"
          required
        />

        <Field
          id="school"
          label="School"
          error={errors.school}
          value={values.school}
          onChange={set("school")}
          autoComplete="organization"
          required
        />

        <div className="field">
          <label htmlFor="field-grade">
            Class <RequiredMark />
          </label>
          <select
            id="field-grade"
            name="grade"
            value={values.grade}
            onChange={set("grade")}
            aria-invalid={errors.grade ? true : undefined}
            aria-describedby={errors.grade ? "error-grade" : undefined}
            required
          >
            <option value="">Choose a class</option>
            {[9, 10, 11, 12].map((g) => (
              <option key={g} value={String(g)}>
                Class {g}
              </option>
            ))}
          </select>
          <FieldError id="error-grade" message={errors.grade} />
        </div>

        <Field
          id="email"
          label="Email"
          type="email"
          hint="We send your team code and reporting times here."
          error={errors.email}
          value={values.email}
          onChange={set("email")}
          autoComplete="email"
          required
        />

        <Field
          id="phone"
          label="Phone"
          type="tel"
          hint="Reachable on the day of the fest."
          error={errors.phone}
          value={values.phone}
          onChange={set("phone")}
          autoComplete="tel"
          required
        />

        <Field
          id="discord"
          label="Discord"
          hint="Optional. Briefing and results go out on the fest server, so add it if you have one."
          error={errors.discord}
          value={values.discord}
          onChange={set("discord")}
          autoComplete="off"
        />

        <div className="field">
          <label htmlFor="field-event">
            Event <RequiredMark />
          </label>
          <select
            id="field-event"
            name="event"
            value={values.event}
            onChange={set("event")}
            aria-invalid={errors.event ? true : undefined}
            aria-describedby={errors.event ? "error-event hint-event" : "hint-event"}
            required
          >
            <option value="">Choose an event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.team}
              </option>
            ))}
          </select>
          <p id="hint-event" className="field-hint">
            Entering more than one? Submit the form once per event.
          </p>
          <FieldError id="error-event" message={errors.event} />
        </div>

        <fieldset className="party">
          <legend className="party-legend">Other team members</legend>
          <p className="field-hint">
            Leave this empty for a solo entry. You can change it up to the closing date. Everything
            except the name is optional, but a number or a Discord handle means we can reach someone
            if the lead is mid-round.
          </p>

          {members.map((m, i) => (
            <div className="party-row" key={i}>
              <div className="party-head">
                <h3 className="party-title">Member {i + 2}</h3>
                <button
                  type="button"
                  className="party-remove"
                  onClick={() => removeMember(i)}
                  aria-label={`Remove member ${i + 2}`}
                >
                  Remove
                </button>
              </div>

              <div className="party-grid">
                <Field
                  id={`member-${i}-name`}
                  label={MEMBER_LABEL.name}
                  error={memberErrors[i]?.name}
                  value={m.name}
                  onChange={setMember(i, "name")}
                  autoComplete="off"
                />

                <div className="field">
                  <label htmlFor={`field-member-${i}-grade`}>{MEMBER_LABEL.grade}</label>
                  <select
                    id={`field-member-${i}-grade`}
                    name={`member-${i}-grade`}
                    value={m.grade}
                    onChange={setMember(i, "grade")}
                  >
                    <option value="">Choose a class</option>
                    {CLASSES.map((g) => (
                      <option key={g} value={String(g)}>
                        Class {g}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  id={`member-${i}-phone`}
                  label={MEMBER_LABEL.phone}
                  type="tel"
                  error={memberErrors[i]?.phone}
                  value={m.phone}
                  onChange={setMember(i, "phone")}
                  autoComplete="off"
                />

                <Field
                  id={`member-${i}-discord`}
                  label={MEMBER_LABEL.discord}
                  error={memberErrors[i]?.discord}
                  value={m.discord}
                  onChange={setMember(i, "discord")}
                  autoComplete="off"
                />

                <Field
                  id={`member-${i}-email`}
                  label={MEMBER_LABEL.email}
                  type="email"
                  error={memberErrors[i]?.email}
                  value={m.email}
                  onChange={setMember(i, "email")}
                  autoComplete="off"
                />
              </div>
            </div>
          ))}

          <div className="party-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={addMember}
              disabled={members.length >= MAX_MEMBERS}
            >
              Add a team member
            </button>
            {/* Polite: the count changing is worth knowing, not worth interrupting. */}
            <p className="field-hint" aria-live="polite">
              {members.length === 0
                ? "No other members listed — that is a solo entry."
                : `${members.length + 1} people listed, including you.${
                    members.length >= MAX_MEMBERS ? " That is the most this form takes." : ""
                  }`}
            </p>
          </div>
        </fieldset>

        {checked ? (
          <p className="notice notice-ok" role="status" tabIndex={-1} ref={checkedRef}>
            <strong>Your details are complete.</strong>
            <span>
              Nothing has been submitted — entries are not open yet. Come back and submit when they
              are, and keep this page open so you do not retype anything.
            </span>
          </p>
        ) : null}

        <div className="form-actions">
          <button
            type="submit"
            className={`btn btn-block ${registrationOpen ? "btn-accent" : "btn-ghost"}`}
          >
            {registrationOpen ? "Submit registration" : "Check my details"}
          </button>
          <Link to="/events" className="btn btn-ghost btn-block" data-magnetic>
            Read the event details first
          </Link>
        </div>
      </form>
    </PageShell>
  );
}

function RequiredMark() {
  return (
    <span className="field-required">
      <span aria-hidden="true">*</span>
      <span className="sr-only">(required)</span>
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  type?: string | undefined;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  autoComplete?: string | undefined;
}) {
  const describedBy = [hint ? `hint-${id}` : null, error ? `error-${id}` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={`field-${id}`}>
        {label} {required ? <RequiredMark /> : null}
      </label>
      <input
        id={`field-${id}`}
        name={id}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        required={required}
        {...rest}
      />
      {hint ? (
        <p id={`hint-${id}`} className="field-hint">
          {hint}
        </p>
      ) : null}
      <FieldError id={`error-${id}`} message={error} />
    </div>
  );
}
