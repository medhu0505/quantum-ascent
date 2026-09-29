import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { MobileShell, ScreenLink } from "@/components/mobile/MobileShell";
import {
  CLASSES,
  CONTACT_ORDER,
  EMPTY_CONTACT,
  MAX_TEXT,
  OFFLINE,
  checkTeams,
  placeLabel,
  places,
  sendTeams,
  teamNames,
  teamProblems,
  validateContact,
  type Contact,
  type ContactErrors,
  type Failure,
  type Outcomes,
  type Player,
  type PlayerErrors,
  type RegisterDraft,
  type Teams,
} from "@/components/register/logic";
import { REGISTRATION_CLOSES, events, listOf } from "@/data/quantum";
import { isRegistrationOpen } from "@/lib/registrations";

/**
 * Registering on a phone, in four steps: the school, the events, a team for
 * each of those events, and a last look before it is sent.
 *
 * One long form is a lot of scrolling on a phone, and an error at the top is
 * out of sight by the time the button at the bottom is pressed. Split into
 * steps, each screen is short enough to take in, and is checked before the
 * next one opens, so a mistake is caught on the screen where it was made.
 *
 * The rules, the messages and what is sent are the desktop form's own, from
 * register/logic.ts, so an entry is the same whichever screen it came from,
 * and what is typed on one carries over to the other.
 */

type Step = 0 | 1 | 2 | 3;

const STEPS = [
  {
    label: "School",
    title: "Your school",
    lede: `Enter your school's details. Registrations close on ${REGISTRATION_CLOSES.label}.`,
  },
  {
    label: "Events",
    title: "Pick the events",
    lede: "Select every event your school is entering for.",
  },
  {
    label: "Teams",
    title: "The teams",
    lede: "List each event's team. Add each participant's Discord ID: briefings and results go out on the fest Discord server.",
  },
  { label: "Review", title: "Check it", lede: "" },
] as const;

type Found = { errors: ContactErrors; teamErrors: Record<string, PlayerErrors[]> };

const count = ({ errors, teamErrors }: Found) =>
  Object.values(errors).filter(Boolean).length + teamProblems(teamErrors).length;

export function MobileRegister({
  preselectedEvent,
  draft,
}: {
  preselectedEvent?: string | undefined;
  draft?: RefObject<RegisterDraft | null> | undefined;
}) {
  const open = isRegistrationOpen();
  // Read by the initial states only: after the first render the form owns it.
  const saved = draft?.current ?? null;

  const [step, setStep] = useState<Step>(() => {
    if (!saved) return 0;
    // A teams step with no events picked would be an empty screen.
    return (saved.step >= 2 && saved.picked.length === 0 ? 1 : saved.step) as Step;
  });
  const [contact, setContact] = useState<Contact>(saved?.contact ?? EMPTY_CONTACT);
  const [picked, setPicked] = useState<string[]>(
    saved?.picked ?? (preselectedEvent ? [preselectedEvent] : []),
  );
  const [teams, setTeams] = useState<Teams>(saved?.teams ?? {});
  const [outcomes, setOutcomes] = useState<Outcomes>(saved?.outcomes ?? {});
  const [done, setDone] = useState(saved?.done ?? false);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [teamErrors, setTeamErrors] = useState<Record<string, PlayerErrors[]>>({});
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [failures, setFailures] = useState<Failure[]>([]);
  /** Honeypot. Hidden from people and assistive tech; bots fill it in. */
  const [website, setWebsite] = useState("");

  const heading = useRef<HTMLHeadingElement | null>(null);
  const form = useRef<HTMLFormElement | null>(null);
  const notice = useRef<HTMLDivElement | null>(null);
  const moved = useRef(false);
  const focusFirstBad = useRef(false);

  useEffect(() => {
    if (draft) draft.current = { contact, picked, teams, outcomes, done, step };
  }, [draft, contact, picked, teams, outcomes, done, step]);

  /** The errors a step would show if it were checked now. */
  const check = (s: Step): Found => {
    if (s === 0) {
      const all = validateContact(contact, picked);
      const own: ContactErrors = {};
      for (const key of CONTACT_ORDER) if (all[key]) own[key] = all[key];
      return { errors: own, teamErrors: {} };
    }
    if (s === 1) {
      const all = validateContact(contact, picked);
      return { errors: all.events ? { events: all.events } : {}, teamErrors: {} };
    }
    if (s === 2) return { errors: {}, teamErrors: checkTeams(picked, teams) };
    return { errors: {}, teamErrors: {} };
  };

  const goTo = (s: Step) => {
    moved.current = true;
    setStep(s);
    setChecked(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  // A new step, or the receipt, is announced by moving focus to its heading.
  // Not on arrival: that would steal focus from the page the visitor has only
  // just opened.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [step, done]);

  // After a failed Continue, focus goes to the first field that needs fixing.
  useEffect(() => {
    if (!focusFirstBad.current) return;
    focusFirstBad.current = false;
    form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [errors, teamErrors]);

  const fail = (s: Step, found: Found) => {
    if (s !== step) goTo(s);
    focusFirstBad.current = true;
    setErrors(found.errors);
    setTeamErrors(found.teamErrors);
  };

  const next = () => {
    if (sending) return;

    if (step < 3) {
      const found = check(step);
      if (count(found) > 0) return fail(step, found);
      setErrors({});
      setTeamErrors({});
      goTo((step + 1) as Step);
      return;
    }

    // The last look: check every step once more and send the visitor back to
    // the first one with a problem, rather than submitting around it.
    for (const s of [0, 1, 2] as const) {
      const found = check(s);
      if (count(found) > 0) return fail(s, found);
    }

    if (!open) {
      setChecked(true);
      window.requestAnimationFrame(() => notice.current?.focus());
      return;
    }

    setSending(true);
    setFailures([]);
    sendTeams(contact, picked, teams, outcomes, website)
      .then((result) => {
        setOutcomes(result.outcomes);
        setFailures(result.failures);
        if (result.failures.length === 0) {
          moved.current = true;
          setDone(true);
          window.scrollTo({ top: 0, behavior: "auto" });
          return;
        }
        window.requestAnimationFrame(() => notice.current?.focus());
      })
      .catch(() => {
        setFailures([{ event: "", message: OFFLINE }]);
        window.requestAnimationFrame(() => notice.current?.focus());
      })
      .finally(() => setSending(false));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    next();
  };

  const setField = (key: keyof Contact, value: string) => {
    setContact((v) => ({ ...v, [key]: value }));
    setChecked(false);
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const setPlayer = (eventId: string, index: number, key: keyof Player, value: string) => {
    setTeams((all) => {
      const list = places(eventId, all).slice();
      list[index] = { ...list[index]!, [key]: value };
      return { ...all, [eventId]: list };
    });
    setChecked(false);
    setTeamErrors((prev) =>
      prev[eventId]?.[index]?.[key]
        ? {
            ...prev,
            [eventId]: prev[eventId]!.map((row, i) =>
              i === index ? { ...row, [key]: undefined } : row,
            ),
          }
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

  const chosen = events.filter((e) => picked.includes(e.id));
  const problems = count({ errors, teamErrors });
  const anyIn = Object.keys(outcomes).length > 0;

  if (done) {
    const entered = chosen.filter((e) => outcomes[e.id]);
    const repeats = entered.filter((e) => outcomes[e.id]!.duplicate).length;
    return (
      <MobileShell screen="register">
        <div className="m-register">
          <p className="m-eyebrow">Quantum V2.0</p>
          <h1 className="m-reg-title" ref={heading} tabIndex={-1}>
            Registered
          </h1>
          <p className="m-reg-lede">{contact.school.trim()}</p>
          <div className="m-receipt" role="status">
            <strong>
              {repeats === entered.length
                ? entered.length === 1
                  ? "This team is already registered."
                  : "These teams are already registered."
                : entered.length === 1
                  ? "Registration received."
                  : "Registrations received."}
            </strong>
            <span className="m-muted m-small">
              Every team has its own registration ID. Keep them; the organisers will ask for them at
              the desk. Reporting times go to {contact.email.trim()}.
            </span>
          </div>
          <ul className="m-receipt-list">
            {entered.map((event) => {
              const receipt = outcomes[event.id]!;
              return (
                <li key={event.id} data-accent={event.accent}>
                  <span className="m-receipt-event">{event.name}</span>
                  <span className="m-receipt-code">{receipt.id}</span>
                  <span className="m-muted m-small">
                    {receipt.duplicate
                      ? "Already registered from this email. The team sent first is the one on record."
                      : listOf(teamNames(event.id, teams))}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="m-stack">
            <button
              type="button"
              className="m-btn m-btn-accent"
              data-accent="cyan"
              onClick={() => {
                setPicked([]);
                setTeams({});
                setOutcomes({});
                setFailures([]);
                setDone(false);
                goTo(1);
              }}
            >
              Register more teams
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
              id="school"
              label="School"
              required
              value={contact.school}
              error={errors.school}
              autoComplete="organization"
              onChange={(v) => setField("school", v)}
            />
            <Field
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              required
              hint="We send each team's registration ID and reporting times here."
              value={contact.email}
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
              value={contact.phone}
              error={errors.phone}
              autoComplete="tel"
              onChange={(v) => setField("phone", v)}
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
                  disabled={Boolean(outcomes[e.id])}
                  onChange={() => togglePick(e.id)}
                  aria-invalid={errors.events ? true : undefined}
                />
                <span className="m-pick-box" aria-hidden="true" />
                <span className="m-pick-text">
                  <span className="m-pick-name">{e.name}</span>
                  <span className="m-pick-team">
                    {e.team}
                    {outcomes[e.id] ? ` · Registered ${outcomes[e.id]!.id}` : ""}
                  </span>
                </span>
                <span className="m-pick-dot" aria-hidden="true" />
              </label>
            ))}
            <p id="m-hint-events" className="m-pick-hint">
              <span>
                A student can compete in only one event, so each event needs different students.
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
            {chosen.map((event) => {
              const receipt = outcomes[event.id];
              return (
                <section
                  key={event.id}
                  className="m-team"
                  data-accent={event.accent}
                  aria-labelledby={`m-team-${event.id}`}
                >
                  <h2 className="m-team-head" id={`m-team-${event.id}`}>
                    <span className="m-team-name">{event.name}</span>
                    <span className="m-team-size">{event.team}</span>
                  </h2>
                  {receipt ? (
                    <p className="m-team-done">
                      Registered · <strong>{receipt.id}</strong>
                    </p>
                  ) : (
                    places(event.id, teams).map((p, i) => {
                      const base = `team-${event.id}-${i}`;
                      const err = teamErrors[event.id]?.[i] ?? {};
                      const needed = i < event.size.min;
                      return (
                        <fieldset key={i} className="m-member">
                          <legend className="sr-only">
                            {event.name}, {placeLabel(event, i)}
                          </legend>
                          <span className="m-member-title" aria-hidden="true">
                            {placeLabel(event, i)}
                          </span>
                          <Field
                            id={`${base}-name`}
                            label="Full name"
                            required={needed}
                            value={p.name}
                            error={err.name}
                            autoComplete="off"
                            onChange={(v) => setPlayer(event.id, i, "name", v)}
                          />
                          <fieldset className="m-field">
                            <legend className="m-label">
                              Class {needed ? <Required /> : null}
                            </legend>
                            <div className="m-classes">
                              {CLASSES.map((g) => (
                                <label key={g} className="m-class">
                                  <input
                                    type="radio"
                                    name={`${base}-grade`}
                                    value={String(g)}
                                    checked={p.grade === String(g)}
                                    onChange={() => setPlayer(event.id, i, "grade", String(g))}
                                    aria-invalid={err.grade ? true : undefined}
                                    aria-describedby={
                                      err.grade ? `m-error-${base}-grade` : undefined
                                    }
                                  />
                                  <span>{g}</span>
                                </label>
                              ))}
                            </div>
                            <FieldError id={`m-error-${base}-grade`} message={err.grade} />
                          </fieldset>
                          <Field
                            id={`${base}-discord`}
                            label="Discord ID"
                            value={p.discord}
                            error={err.discord}
                            autoComplete="off"
                            onChange={(v) => setPlayer(event.id, i, "discord", v)}
                          />
                        </fieldset>
                      );
                    })
                  )}
                </section>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          <>
            <dl className="m-review">
              {(
                [
                  ["School", contact.school || "—", 0],
                  ["Email", contact.email || "—", 0],
                  ["Phone", contact.phone || "—", 0],
                  ["Events", listOf(chosen.map((e) => e.name)) || "—", 1],
                  ...chosen.map(
                    (e) =>
                      [
                        e.name,
                        outcomes[e.id]
                          ? `Registered · ${outcomes[e.id]!.id}`
                          : listOf(teamNames(e.id, teams)) || "—",
                        2,
                      ] as const,
                  ),
                ] as const
              ).map(([key, value, target]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    <button type="button" onClick={() => goTo(target as Step)}>
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

        {failures.length > 0 ? (
          <div className="m-alert" role="alert" tabIndex={-1} ref={notice}>
            <strong>{anyIn ? "Not every team was submitted." : "Not submitted."}</strong>
            {failures.map((f) => (
              <span key={f.event || "all"} className="m-alert-line">
                {f.event ? `${events.find((e) => e.id === f.event)?.name ?? f.event}: ` : ""}
                {f.message}
              </span>
            ))}
            {anyIn ? (
              <span className="m-alert-line">
                The teams marked registered are in. Submitting again sends only the rest.
              </span>
            ) : null}
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
        maxLength={MAX_TEXT}
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
