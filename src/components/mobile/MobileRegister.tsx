import { useEffect, useRef, useState, type FormEvent } from "react";
import { MobileShell, ScreenLink } from "@/components/mobile/MobileShell";
import {
  BLANK,
  CLASSES,
  FIELD_ORDER,
  MEMBER_ORDER,
  buildPayload,
  describeFailure,
  validate,
  validateMembers,
  type Errors,
  type Fields,
  type MemberErrors,
  type Receipt,
} from "@/components/register/logic";
import { REGISTRATION_CLOSES, events } from "@/data/quantum";
import {
  MAX_MEMBERS,
  isRegistrationOpen,
  submitRegistration,
  type Participant,
} from "@/lib/registrations";

/**
 * Registering on a phone, in four steps: the team lead, the events, the rest
 * of the team, and a last look before it is sent.
 *
 * One long form is a lot of scrolling on a phone, and an error at the top is
 * out of sight by the time the button at the bottom is pressed. Split into
 * steps, each screen is short enough to see whole and is checked before the
 * next one opens, so a mistake is caught on the screen where it was made.
 *
 * The rules, the messages and what is sent are the desktop form's own, from
 * register/logic.ts, so an entry is the same whichever screen it came from.
 */

const EMPTY: Fields = { student: "", school: "", grade: "", email: "", phone: "", discord: "" };

type Step = 0 | 1 | 2 | 3;

const STEPS = [
  {
    label: "Lead",
    title: "Team lead",
    lede: `Enter the team lead's details. Each student can compete in only one event, so a school fills this in once for each team. Entries close on ${REGISTRATION_CLOSES.label}.`,
  },
  { label: "Event", title: "Pick the event", lede: "Tick the event this team is entering." },
  {
    label: "Team",
    title: "The team",
    lede: "Leave this empty for a solo entry. Everything except the name is optional.",
  },
  { label: "Review", title: "Check it", lede: "" },
] as const;

/** Which step a field lives on, for sending the visitor back to it. */
function stepOf(field: string | undefined): Step {
  if (field === "events") return 1;
  if (field === "members") return 2;
  return 0;
}

const errorCount = (errors: Errors, memberErrors: MemberErrors[]) =>
  Object.values(errors).filter(Boolean).length +
  memberErrors.reduce((n, row) => n + MEMBER_ORDER.filter((k) => row[k]).length, 0);

export function MobileRegister({ preselectedEvent }: { preselectedEvent?: string | undefined }) {
  const open = isRegistrationOpen();

  const [step, setStep] = useState<Step>(0);
  const [values, setValues] = useState<Fields>(EMPTY);
  const [picked, setPicked] = useState<string[]>(preselectedEvent ? [preselectedEvent] : []);
  const [members, setMembers] = useState<Participant[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [memberErrors, setMemberErrors] = useState<MemberErrors[]>([]);
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  /** Honeypot. Hidden from people and assistive tech; bots fill it in. */
  const [website, setWebsite] = useState("");

  const heading = useRef<HTMLHeadingElement | null>(null);
  const form = useRef<HTMLFormElement | null>(null);
  const notice = useRef<HTMLDivElement | null>(null);
  const moved = useRef(false);
  const focusFirstBad = useRef(false);

  /** The errors a step would show if it were checked now. */
  const check = (s: Step): { errors: Errors; memberErrors: MemberErrors[] } => {
    const all = validate(values, picked);
    if (s === 0) {
      const lead: Errors = {};
      for (const key of FIELD_ORDER) if (all[key]) lead[key] = all[key];
      return { errors: lead, memberErrors: [] };
    }
    if (s === 1) return { errors: all.events ? { events: all.events } : {}, memberErrors: [] };
    if (s === 2) return { errors: {}, memberErrors: validateMembers(members) };
    return { errors: {}, memberErrors: [] };
  };

  const goTo = (s: Step) => {
    moved.current = true;
    setStep(s);
    setChecked(false);
    setSendError(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  // A new step, or the receipt, is announced by moving focus to its heading.
  // Not on arrival: that would steal focus from the page the visitor has only
  // just opened.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [step, receipt]);

  // After a failed Continue, focus goes to the first field that needs fixing.
  useEffect(() => {
    if (!focusFirstBad.current) return;
    focusFirstBad.current = false;
    form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [errors, memberErrors]);

  const fail = (s: Step, found: { errors: Errors; memberErrors: MemberErrors[] }) => {
    if (s !== step) goTo(s);
    focusFirstBad.current = true;
    setErrors(found.errors);
    setMemberErrors(found.memberErrors);
  };

  const next = () => {
    if (sending) return;

    if (step < 3) {
      const found = check(step);
      if (errorCount(found.errors, found.memberErrors) > 0) return fail(step, found);
      setErrors({});
      setMemberErrors([]);
      goTo((step + 1) as Step);
      return;
    }

    // The last look: check every step once more and send the visitor back to
    // the first one with a problem, rather than submitting around it.
    for (const s of [0, 1, 2] as const) {
      const found = check(s);
      if (errorCount(found.errors, found.memberErrors) > 0) return fail(s, found);
    }

    if (!open) {
      setChecked(true);
      window.requestAnimationFrame(() => notice.current?.focus());
      return;
    }

    setSending(true);
    setSendError(null);
    submitRegistration(buildPayload(values, picked, members, website))
      .then((reply) => {
        if (reply.ok) {
          moved.current = true;
          setReceipt({ id: reply.id, duplicate: Boolean(reply.duplicate) });
          window.scrollTo({ top: 0, behavior: "auto" });
          return;
        }
        const message = describeFailure(reply);
        if (reply.error === "invalid") goTo(stepOf(reply.field));
        setSendError(message);
        window.requestAnimationFrame(() => notice.current?.focus());
      })
      .catch(() => {
        setSendError(
          "Could not reach the registration server. Check your connection; your answers are still here, so submit again when you are back online.",
        );
        window.requestAnimationFrame(() => notice.current?.focus());
      })
      .finally(() => setSending(false));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    next();
  };

  const setField = (key: keyof Fields, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setChecked(false);
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const setMember = (index: number, key: keyof Participant, value: string) => {
    setMembers((list) => list.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
    setChecked(false);
    setMemberErrors((prev) =>
      prev[index]?.[key]
        ? prev.map((row, i) => (i === index ? { ...row, [key]: undefined } : row))
        : prev,
    );
  };

  const togglePick = (id: string) => {
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
    setChecked(false);
    setErrors((prev) => {
      if (!prev.events) return prev;
      const rest = { ...prev };
      delete rest.events;
      return rest;
    });
  };

  const pickedNames = events.filter((e) => picked.includes(e.id)).map((e) => e.name);
  const teamSize = members.filter((m) => m.name.trim()).length + 1;
  const problems = errorCount(errors, memberErrors);

  if (receipt) {
    return (
      <MobileShell screen="register">
        <div className="m-register">
          <p className="m-eyebrow">Quantum V2.0</p>
          <h1 className="m-reg-title" ref={heading} tabIndex={-1}>
            Registered
          </h1>
          <p className="m-reg-lede">
            {pickedNames.join(", ")} · {values.school.trim()}
          </p>
          <div className="m-receipt" role="status">
            <strong>
              {receipt.duplicate
                ? "This team is already registered for these events."
                : "Registration received."}
            </strong>
            <span className="m-receipt-id">{receipt.id}</span>
            <span className="m-muted m-small">
              Keep it; the organisers will ask for it at the desk. Reporting times go to{" "}
              {values.email.trim()}.
            </span>
          </div>
          <div className="m-stack">
            <button
              type="button"
              className="m-btn m-btn-accent"
              data-accent="cyan"
              onClick={() => {
                setReceipt(null);
                setPicked([]);
                goTo(1);
              }}
            >
              Register the same lead for different events
            </button>
            <ScreenLink to="/events" className="m-btn m-btn-ghost">
              Back to the events
            </ScreenLink>
          </div>
        </div>
      </MobileShell>
    );
  }

  const meta = STEPS[step];
  const lede =
    step === 3
      ? open
        ? "One last look before it goes to the organisers."
        : "One last look before you check your details."
      : meta.lede;

  return (
    <MobileShell screen="register">
      <form ref={form} className="m-register" onSubmit={onSubmit} noValidate>
        <p className="m-eyebrow m-eyebrow-magenta">
          Quantum V2.0 · Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="m-reg-title" ref={heading} tabIndex={-1}>
          {meta.title}
        </h1>
        <p className="m-reg-lede m-muted">{lede}</p>

        <ol className="m-stepper" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.label} data-state={i < step ? "done" : i === step ? "now" : "todo"}>
              {i < step ? (
                <button type="button" onClick={() => goTo(i as Step)}>
                  <span className="m-stepper-bar" aria-hidden="true" />
                  {s.label}
                  <span className="sr-only"> (done, go back to it)</span>
                </button>
              ) : (
                <span aria-current={i === step ? "step" : undefined}>
                  <span className="m-stepper-bar" aria-hidden="true" />
                  {s.label}
                </span>
              )}
            </li>
          ))}
        </ol>

        {!open ? (
          <div className="m-note">
            <span className="todo">
              <span aria-hidden="true">⚠</span> Entries are not open yet
            </span>
            <span>
              Fill this in and choose <strong>Check my details</strong> to confirm you have
              everything ready.
            </span>
          </div>
        ) : null}

        {problems > 0 ? (
          <div className="m-alert" role="alert">
            {errors.events ??
              (problems === 1 ? "One field needs fixing" : `${problems} fields need fixing`)}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="m-fields">
            <Field
              id="student"
              label="Team lead's full name"
              required
              value={values.student}
              error={errors.student}
              autoComplete="name"
              onChange={(v) => setField("student", v)}
            />
            <Field
              id="school"
              label="School"
              required
              value={values.school}
              error={errors.school}
              autoComplete="organization"
              onChange={(v) => setField("school", v)}
            />
            <fieldset className="m-field">
              <legend className="m-label">
                Class <Required />
              </legend>
              <div className="m-classes">
                {CLASSES.map((g) => (
                  <label key={g} className="m-class">
                    <input
                      type="radio"
                      name="grade"
                      value={String(g)}
                      checked={values.grade === String(g)}
                      onChange={() => setField("grade", String(g))}
                      aria-invalid={errors.grade ? true : undefined}
                      aria-describedby={errors.grade ? "m-error-grade" : undefined}
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
              <FieldError id="m-error-grade" message={errors.grade} />
            </fieldset>
            <Field
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              required
              hint="We send your team code and reporting times here."
              value={values.email}
              error={errors.email}
              autoComplete="email"
              onChange={(v) => setField("email", v)}
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              inputMode="tel"
              required
              hint="10 digits, reachable on both fest days. No +91 needed."
              value={values.phone}
              error={errors.phone}
              autoComplete="tel"
              onChange={(v) => setField("phone", v)}
            />
            <Field
              id="discord"
              label="Discord"
              hint="Optional. Briefing and results go out on the fest server."
              value={values.discord}
              error={errors.discord}
              autoComplete="off"
              onChange={(v) => setField("discord", v)}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <fieldset className="m-picks" aria-describedby="m-hint-events">
            <legend className="sr-only">Events</legend>
            {events.map((e) => (
              <label key={e.id} className="m-pick" data-accent={e.accent}>
                <input
                  type="checkbox"
                  name="events"
                  value={e.id}
                  checked={picked.includes(e.id)}
                  onChange={() => togglePick(e.id)}
                  aria-invalid={errors.events ? true : undefined}
                />
                <span className="m-pick-box" aria-hidden="true" />
                <span className="m-pick-text">
                  <span className="m-pick-name">{e.name}</span>
                  <span className="m-pick-team">{e.team}</span>
                </span>
                <span className="m-pick-dot" aria-hidden="true" />
              </label>
            ))}
            <p id="m-hint-events" className="m-pick-hint">
              <span>
                A student can compete in only one event, so every team goes on its own form.
              </span>
              {picked.length ? (
                <span className="m-pick-count" aria-live="polite">
                  {picked.length} selected
                </span>
              ) : null}
            </p>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <div className="m-fields">
            <div className="m-lead-card">
              <span className="m-lead-num" aria-hidden="true">
                1
              </span>
              <span>
                <span className="m-lead-name">{values.student.trim() || "Team lead"}</span>
                <span className="m-muted m-small">Team lead</span>
              </span>
            </div>
            {members.map((m, i) => (
              <fieldset key={i} className="m-member">
                <legend className="sr-only">Member {i + 2}</legend>
                <div className="m-member-head">
                  <span className="m-member-title" aria-hidden="true">
                    Member {i + 2}
                  </span>
                  <button
                    type="button"
                    className="m-chip-btn"
                    aria-label={`Remove member ${i + 2}`}
                    onClick={() => {
                      setMembers((list) => list.filter((_, j) => j !== i));
                      setMemberErrors((prev) => prev.filter((_, j) => j !== i));
                    }}
                  >
                    Remove
                  </button>
                </div>
                <Field
                  id={`member-${i}-name`}
                  label={`Member ${i + 2}, full name`}
                  hideLabel
                  placeholder="Full name"
                  value={m.name}
                  error={memberErrors[i]?.name}
                  autoComplete="off"
                  onChange={(v) => setMember(i, "name", v)}
                />
                <div className="m-member-grid">
                  <Field
                    id={`member-${i}-phone`}
                    label={`Member ${i + 2}, phone`}
                    hideLabel
                    placeholder="Phone"
                    type="tel"
                    inputMode="tel"
                    value={m.phone}
                    error={memberErrors[i]?.phone}
                    autoComplete="off"
                    onChange={(v) => setMember(i, "phone", v)}
                  />
                  <Field
                    id={`member-${i}-discord`}
                    label={`Member ${i + 2}, Discord`}
                    hideLabel
                    placeholder="Discord"
                    value={m.discord}
                    error={memberErrors[i]?.discord}
                    autoComplete="off"
                    onChange={(v) => setMember(i, "discord", v)}
                  />
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className="m-btn m-btn-ghost"
              disabled={members.length >= MAX_MEMBERS}
              onClick={() => {
                setMembers((list) => [...list, { ...BLANK }]);
                setMemberErrors((prev) => [...prev, {}]);
              }}
            >
              + Add a team member
            </button>
            <p className="m-muted m-small" aria-live="polite">
              {members.length === 0
                ? "No other members listed — that is a solo entry."
                : `${members.length + 1} people listed, including you.${
                    members.length >= MAX_MEMBERS ? " That is the most this form takes." : ""
                  }`}
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <>
            <dl className="m-review">
              {(
                [
                  ["Lead", values.student || "—", 0],
                  [
                    "School",
                    `${values.school || "—"}${values.grade ? ` · Class ${values.grade}` : ""}`,
                    0,
                  ],
                  ["Email", values.email || "—", 0],
                  ["Phone", values.phone || "—", 0],
                  ["Discord", values.discord || "—", 0],
                  [picked.length > 1 ? "Events" : "Event", pickedNames.join(", ") || "—", 1],
                  ["Team", teamSize === 1 ? "Solo entry" : `${teamSize} people`, 2],
                ] as const
              ).map(([key, value, target]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    <button type="button" onClick={() => goTo(target)}>
                      {value}
                      <span className="sr-only"> (change)</span>
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="m-muted m-small m-review-hint">Tap any row to change it.</p>
          </>
        ) : null}

        {/* Off-screen honeypot. Real visitors never reach it. */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="m-field-website">Website</label>
          <input
            id="m-field-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {sendError ? (
          <div className="m-alert" role="alert" tabIndex={-1} ref={notice}>
            <strong>Not submitted.</strong> {sendError}
          </div>
        ) : null}

        {checked ? (
          <div className="m-ok" role="status" tabIndex={-1} ref={notice}>
            <strong>Your details are complete.</strong>
            <span>
              Nothing has been submitted: entries are not open yet. Keep this page open so you do
              not retype anything.
            </span>
          </div>
        ) : null}

        <div className="m-actions">
          {step > 0 ? (
            <button
              type="button"
              className="m-btn m-btn-ghost m-btn-back"
              onClick={() => goTo((step - 1) as Step)}
            >
              ← Back
            </button>
          ) : null}
          <button
            type="submit"
            className="m-btn m-btn-accent m-btn-next"
            data-accent="cyan"
            disabled={sending}
            aria-busy={sending || undefined}
          >
            {step < 3
              ? "Continue →"
              : !open
                ? "Check my details"
                : sending
                  ? "Submitting…"
                  : "Submit registration"}
          </button>
        </div>
      </form>
    </MobileShell>
  );
}

function Required() {
  return (
    <span className="m-required">
      <span aria-hidden="true">*</span>
      <span className="sr-only">(required)</span>
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="m-error">
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
  hideLabel,
  type = "text",
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  hideLabel?: boolean;
  type?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "tel" | "text";
  onChange: (value: string) => void;
}) {
  const describedBy = [hint ? `m-hint-${id}` : null, error ? `m-error-${id}` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="m-field">
      <label htmlFor={`m-field-${id}`} className={hideLabel ? "sr-only" : "m-label"}>
        {label} {required ? <Required /> : null}
      </label>
      <input
        id={`m-field-${id}`}
        name={id}
        type={type}
        className="m-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {hint ? (
        <p id={`m-hint-${id}`} className="m-hint">
          {hint}
        </p>
      ) : null}
      <FieldError id={`m-error-${id}`} message={error} />
    </div>
  );
}
