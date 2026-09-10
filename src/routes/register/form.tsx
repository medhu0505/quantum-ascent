import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
  event: string;
  members: string;
};

type Errors = Partial<Record<keyof Fields, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values: Fields): Errors {
  const errors: Errors = {};
  if (!values.student.trim()) errors.student = "Enter the name of the team lead.";
  if (!values.school.trim()) errors.school = "Enter your school's name.";
  if (!values.grade) errors.grade = "Choose the team lead's class.";
  if (!values.email.trim()) errors.email = "Enter an email we can send the confirmation to.";
  else if (!EMAIL.test(values.email.trim())) errors.email = "That email address is not valid.";
  if (!values.phone.trim()) errors.phone = "Enter a phone number we can reach on the day.";
  else if (values.phone.replace(/\D/g, "").length < 10)
    errors.phone = "Enter a full phone number, including the area or country code.";
  if (!values.event) errors.event = "Choose the event you are entering.";
  return errors;
}

const FIELD_ORDER: (keyof Fields)[] = [
  "student",
  "school",
  "grade",
  "email",
  "phone",
  "event",
  "members",
];

function RegisterForm() {
  const { event: preselected } = Route.useSearch();
  const registrationOpen = !isTodo(REGISTRATION_FORM_URL);

  const [values, setValues] = useState<Fields>({
    student: "",
    school: "",
    grade: "",
    email: "",
    phone: "",
    event: preselected ?? "",
    members: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const set =
    (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setSubmitted(true);

    const firstBad = FIELD_ORDER.find((key) => found[key]);
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    if (registrationOpen) {
      // The organisers' form is the system of record; hand off with the
      // answers we already have so nothing is retyped.
      const url = new URL(REGISTRATION_FORM_URL);
      for (const [k, v] of Object.entries(values)) url.searchParams.set(k, v);
      window.location.href = url.toString();
    }
  };

  const errorList = FIELD_ORDER.filter((k) => errors[k]);

  return (
    <PageShell
      title="Register"
      back={{ to: "/register", label: "Register" }}
      lede="One form covers every event. Enter the team lead's details, pick what you are entering, and list the rest of the team."
    >
      {!registrationOpen ? (
        <p className="notice notice-todo" role="status">
          <span className="todo">
            <span aria-hidden="true">⚠</span> Entries are not open yet
          </span>
          <span>
            The entry form is still being finalised. Everything below works — fill it in to check
            your details are ready, and come back when entries open.
          </span>
        </p>
      ) : null}

      <form ref={formRef} className="form" onSubmit={onSubmit} noValidate>
        {submitted && errorList.length > 0 ? (
          <div className="form-summary" role="alert" tabIndex={-1}>
            <p className="form-summary-title">
              {errorList.length === 1
                ? "One field needs fixing"
                : `${errorList.length} fields need fixing`}
            </p>
            <ul>
              {errorList.map((key) => (
                <li key={key}>
                  <a href={`#field-${key}`}>{errors[key]}</a>
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

        <div className="field">
          <label htmlFor="field-members">Other team members</label>
          <textarea
            id="field-members"
            name="members"
            rows={4}
            value={values.members}
            onChange={set("members")}
            aria-describedby="hint-members"
            placeholder={"One name and class per line"}
          />
          <p id="hint-members" className="field-hint">
            Leave blank for solo entries. You can change this up to the closing date.
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-accent btn-block" disabled={!registrationOpen}>
            {registrationOpen ? "Submit registration" : "Entries not open yet"}
          </button>
          <Link to="/events" className="btn btn-ghost btn-block">
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
  id: keyof Fields;
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
