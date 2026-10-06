import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { PageShell } from "@/components/site/PageShell";
import { REGISTRATION_CLOSES, eventDay, events, listOf, type QuantumEvent } from "@/data/quantum";
import { isRegistrationOpen } from "@/lib/registrations";
import {
  CLASSES,
  CONTACT_ORDER,
  EMPTY_CONTACT,
  MAX_TEXT,
  OFFLINE,
  checkTeams,
  placeLabel,
  placeName,
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

/**
 * The registration form.
 *
 * One page, for a school. At the top, whom the organisers write to and call,
 * and the teacher in-charge who brings the teams. Under that the six events,
 * each its own section: ticking one opens that
 * event's team right beneath it, with exactly as many places as the event
 * takes, and every place asks for a name, a class and a Discord ID. A student
 * can compete in only one event, so the same student under two events is
 * caught before anything is sent.
 *
 * Plain controlled state rather than a form library, so the error wiring —
 * aria-invalid, aria-describedby, focus on the first bad field, a summary that
 * links to each one — stays explicit and testable.
 *
 * Each event goes to the backend as an entry of its own, with its own
 * registration id, so one event failing never costs the others, and sending
 * again is always safe: an event that already went through is shown as
 * registered and is not sent twice. src/lib/registrations.ts decides where the
 * entries go; this file only reads back an id, or a reason there is none.
 *
 * There is still no fake success path. Until a backend is configured the form
 * checks everything and says plainly that entries are not open yet.
 */

export function RegisterFormBody({
  preselectedEvent,
  draft,
}: {
  preselectedEvent?: string | undefined;
  draft?: RefObject<RegisterDraft | null> | undefined;
}) {
  const registrationOpen = isRegistrationOpen();
  // Read by the initial states only: after the first render the form owns it.
  const saved = draft?.current ?? null;

  const [contact, setContact] = useState<Contact>({ ...EMPTY_CONTACT, ...saved?.contact });
  const [picked, setPicked] = useState<string[]>(
    saved?.picked ?? (preselectedEvent ? [preselectedEvent] : []),
  );
  const [teams, setTeams] = useState<Teams>(saved?.teams ?? {});
  const [outcomes, setOutcomes] = useState<Outcomes>(saved?.outcomes ?? {});
  const [done, setDone] = useState(saved?.done ?? false);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [teamErrors, setTeamErrors] = useState<Record<string, PlayerErrors[]>>({});
  const [submitted, setSubmitted] = useState(false);
  /** Set once the form validates while entries are still closed. */
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [failures, setFailures] = useState<Failure[]>([]);
  /** Honeypot. Hidden from people and assistive tech; bots fill it in. */
  const [website, setWebsite] = useState("");

  const formRef = useRef<HTMLFormElement | null>(null);
  const checkedRef = useRef<HTMLParagraphElement | null>(null);
  const failedRef = useRef<HTMLDivElement | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!draft) return;
    draft.current = { contact, picked, teams, outcomes, done, step: draft.current?.step ?? 0 };
  }, [draft, contact, picked, teams, outcomes, done]);

  const focus = (selector: string) =>
    window.requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>(selector)?.focus(),
    );

  const setField = (key: keyof Contact) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContact((v) => ({ ...v, [key]: value }));
    setChecked(false);
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const togglePick = (id: string, on: boolean) => {
    setPicked((list) => (on ? [...list, id] : list.filter((x) => x !== id)));
    setChecked(false);
    setErrors((prev) => {
      if (!prev.events) return prev;
      const rest = { ...prev };
      delete rest.events;
      return rest;
    });
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;

    const found = validateContact(contact, picked);
    const foundTeams = checkTeams(picked, teams);
    setErrors(found);
    setTeamErrors(foundTeams);
    setSubmitted(true);
    setFailures([]);

    const firstBad = CONTACT_ORDER.find((key) => found[key]);
    const firstTeam = teamProblems(foundTeams)[0];
    if (firstBad || found.events || firstTeam) {
      focus(
        firstBad
          ? `#field-${firstBad}`
          : found.events
            ? "[name='events']"
            : `#field-team-${firstTeam!.event.id}-${firstTeam!.index}-${firstTeam!.key}`,
      );
      return;
    }

    if (!registrationOpen) {
      // Entries are not open, so there is nothing to submit to, but the form
      // still reports whether what has been typed would pass. Disabling the
      // button instead would make the notice above a lie.
      setChecked(true);
      window.requestAnimationFrame(() => checkedRef.current?.focus());
      return;
    }

    setSending(true);
    sendTeams(contact, picked, teams, outcomes, website)
      .then((result) => {
        setOutcomes(result.outcomes);
        setFailures(result.failures);
        if (result.failures.length === 0) {
          setDone(true);
          window.requestAnimationFrame(() => receiptRef.current?.focus());
        } else {
          window.requestAnimationFrame(() => failedRef.current?.focus());
        }
      })
      .catch(() => {
        setFailures([{ event: "", message: OFFLINE }]);
        window.requestAnimationFrame(() => failedRef.current?.focus());
      })
      .finally(() => setSending(false));
  };

  const registerMore = () => {
    setPicked([]);
    setTeams({});
    setOutcomes({});
    setDone(false);
    setSubmitted(false);
    setErrors({});
    setTeamErrors({});
    setFailures([]);
  };

  if (done) {
    const entered = events.filter((e) => picked.includes(e.id) && outcomes[e.id]);
    const repeats = entered.filter((e) => outcomes[e.id]!.duplicate).length;
    return (
      <PageShell title="Registered" lede={contact.school.trim()} registerChip={false}>
        <div className="notice notice-ok" role="status" tabIndex={-1} ref={receiptRef}>
          <strong>
            {repeats === entered.length
              ? entered.length === 1
                ? "This team is already registered."
                : "These teams are already registered."
              : entered.length === 1
                ? "Registration received."
                : "Registrations received."}
          </strong>
          <span>
            Every team has its own registration ID. Keep them; the organisers will ask for them at
            the desk. Reporting times go to {contact.email.trim()}.
          </span>
        </div>
        <ul className="receipt-list">
          {entered.map((event) => {
            const receipt = outcomes[event.id]!;
            return (
              <li key={event.id} className="receipt-item" data-accent={event.accent}>
                <span className="receipt-event">{event.name}</span>
                <strong className="receipt-id">{receipt.id}</strong>
                <span className="receipt-team">
                  {receipt.duplicate
                    ? "Already registered from this email. The team sent first is the one on record."
                    : listOf(teamNames(event.id, teams))}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="form-actions">
          <button type="button" className="btn btn-accent btn-block" onClick={registerMore}>
            Register more teams
          </button>
          <Link to="/events" className="btn btn-ghost btn-block" data-magnetic>
            Back to the events
          </Link>
        </div>
      </PageShell>
    );
  }

  const contactList = CONTACT_ORDER.filter((key) => errors[key]);
  const teamList = teamProblems(teamErrors);
  const problems = contactList.length + (errors.events ? 1 : 0) + teamList.length;

  return (
    <PageShell
      title="Register"
      lede={`Enter your school's details and its teacher in-charge, then select every event your school is entering for and list its team under it. Registrations close on ${REGISTRATION_CLOSES.label}.`}
      registerChip={false}
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
              {contactList.map((key) => (
                <li key={key}>
                  <a href={`#field-${key}`}>{errors[key]}</a>
                </li>
              ))}
              {errors.events ? (
                <li>
                  <a href={`#field-event-${events[0]!.id}`}>{errors.events}</a>
                </li>
              ) : null}
              {teamList.map(({ event, index, key, message }) => (
                <li key={`${event.id}-${index}-${key}`}>
                  <a href={`#field-team-${event.id}-${index}-${key}`}>
                    {placeName(event, index)}: {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset className="form-block">
          <legend className="form-block-title">Your school</legend>
          <Field
            id="school"
            label="School"
            error={errors.school}
            value={contact.school}
            onChange={setField("school")}
            autoComplete="organization"
            required
          />
          <div className="field-row">
            <Field
              id="email"
              label="Email"
              type="email"
              hint="We send each team's registration ID and reporting times here."
              error={errors.email}
              value={contact.email}
              onChange={setField("email")}
              autoComplete="email"
              required
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              hint="10 digits, reachable on both fest days. No +91 needed."
              error={errors.phone}
              value={contact.phone}
              onChange={setField("phone")}
              autoComplete="tel"
              required
            />
          </div>
        </fieldset>

        <fieldset className="form-block">
          <legend className="form-block-title">Teacher in-charge</legend>
          <Field
            id="teacher"
            label="Teacher's name"
            hint="The teacher who will bring the teams on the day."
            error={errors.teacher}
            value={contact.teacher}
            onChange={setField("teacher")}
            autoComplete="off"
            required
          />
          <div className="field-row">
            <Field
              id="teacherPhone"
              label="Teacher's phone"
              type="tel"
              hint="10 digits. No +91 needed."
              error={errors.teacherPhone}
              value={contact.teacherPhone}
              onChange={setField("teacherPhone")}
              autoComplete="off"
              required
            />
            <Field
              id="teacherEmail"
              label="Teacher's email"
              type="email"
              error={errors.teacherEmail}
              value={contact.teacherEmail}
              onChange={setField("teacherEmail")}
              autoComplete="off"
              required
            />
          </div>
        </fieldset>

        <fieldset
          className="form-block entries"
          aria-describedby={errors.events ? "hint-events error-events" : "hint-events"}
        >
          <legend className="form-block-title">
            Events and teams <RequiredMark />
          </legend>
          <p id="hint-events" className="field-hint">
            Select every event your school is entering for, and its team opens under it. A student
            can compete in only one event, so each event needs different students. Add each
            participant's Discord ID: briefings and results go out on the fest Discord server.
          </p>
          <FieldError id="error-events" message={errors.events} />

          <ul className="entry-list">
            {events.map((event) => {
              const on = picked.includes(event.id);
              const receipt = outcomes[event.id];
              return (
                <li key={event.id} className="entry" data-on={on || undefined}>
                  <label className="event-pick entry-pick" htmlFor={`field-event-${event.id}`}>
                    <input
                      type="checkbox"
                      id={`field-event-${event.id}`}
                      name="events"
                      value={event.id}
                      checked={on}
                      disabled={Boolean(receipt)}
                      aria-invalid={errors.events ? true : undefined}
                      onChange={(ev) => togglePick(event.id, ev.currentTarget.checked)}
                    />
                    <span className="event-pick-body">
                      <span className="event-pick-name">{event.name}</span>
                      <span className="event-pick-team">
                        {event.team} · {eventDay(event)}
                      </span>
                    </span>
                  </label>

                  {on && receipt ? (
                    <p className="entry-done" id={`team-${event.id}`}>
                      Registered · <strong>{receipt.id}</strong>
                    </p>
                  ) : on ? (
                    <TeamFields
                      event={event}
                      team={places(event.id, teams)}
                      errors={teamErrors[event.id] ?? []}
                      onChange={setPlayer}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Off-screen honeypot. Real visitors never reach it. */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="field-website">Website</label>
          <input
            id="field-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {failures.length > 0 ? (
          <div className="form-summary" role="alert" tabIndex={-1} ref={failedRef}>
            <p className="form-summary-title">
              {Object.keys(outcomes).length > 0 ? "Not every team was submitted" : "Not submitted"}
            </p>
            <ul>
              {failures.map((f) => (
                <li key={f.event || "all"}>
                  {f.event ? `${events.find((e) => e.id === f.event)?.name ?? f.event}: ` : ""}
                  {f.message}
                </li>
              ))}
            </ul>
            {Object.keys(outcomes).length > 0 ? (
              <p className="field-hint">
                The teams marked registered are in. Submitting again sends only the rest.
              </p>
            ) : null}
          </div>
        ) : null}

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
          <SubmitButton registrationOpen={registrationOpen} sending={sending} />
          <Link to="/events" className="btn btn-ghost btn-block" data-magnetic>
            Read the event details first
          </Link>
        </div>
      </form>
    </PageShell>
  );
}

/** One event's places, right under its checkbox. */
function TeamFields({
  event,
  team,
  errors,
  onChange,
}: {
  event: QuantumEvent;
  team: Player[];
  errors: PlayerErrors[];
  onChange: (eventId: string, index: number, key: keyof Player, value: string) => void;
}) {
  return (
    <div className="entry-team" id={`team-${event.id}`}>
      {team.map((p, i) => {
        const base = `team-${event.id}-${i}`;
        const err = errors[i] ?? {};
        const needed = i < event.size.min;
        const set = (key: keyof Player) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
          onChange(event.id, i, key, e.target.value);
        return (
          <fieldset key={i} className="entry-row">
            <legend className="entry-place">
              <span className="sr-only">{event.name}, </span>
              {placeLabel(event, i)}
            </legend>
            <div className="entry-grid">
              <Field
                id={`${base}-name`}
                label="Full name"
                error={err.name}
                value={p.name}
                onChange={set("name")}
                autoComplete="off"
                required={needed}
              />
              <div className="field">
                <label htmlFor={`field-${base}-grade`}>
                  Class {needed ? <RequiredMark /> : null}
                </label>
                <select
                  id={`field-${base}-grade`}
                  name={`${base}-grade`}
                  value={p.grade}
                  onChange={set("grade")}
                  aria-invalid={err.grade ? true : undefined}
                  aria-describedby={err.grade ? `error-${base}-grade` : undefined}
                  required={needed}
                >
                  <option value="">Choose a class</option>
                  {CLASSES.map((g) => (
                    <option key={g} value={String(g)}>
                      Class {g}
                    </option>
                  ))}
                </select>
                <FieldError id={`error-${base}-grade`} message={err.grade} />
              </div>
              <Field
                id={`${base}-discord`}
                label="Discord ID"
                error={err.discord}
                value={p.discord}
                onChange={set("discord")}
                autoComplete="off"
              />
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function SubmitButton({
  registrationOpen,
  sending,
}: {
  registrationOpen: boolean;
  sending: boolean;
}) {
  return (
    <button
      type="submit"
      className={`btn btn-block ${registrationOpen ? "btn-accent" : "btn-ghost"}`}
      disabled={sending}
      aria-busy={sending || undefined}
    >
      {!registrationOpen ? "Check my details" : sending ? "Submitting…" : "Submit registration"}
    </button>
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
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
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
        maxLength={MAX_TEXT}
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
