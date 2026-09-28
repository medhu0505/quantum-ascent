import { Link } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { PageShell } from "@/components/site/PageShell";
import { REGISTRATION_CLOSES, eventDay, events, type QuantumEvent } from "@/data/quantum";
import { isRegistrationOpen, submitEach, type EventOutcome } from "@/lib/registrations";
import {
  CLASSES,
  TEACHER_ORDER,
  buildTeamPayloads,
  checkTeams,
  describeFailure,
  places,
  shortBy,
  validateTeacher,
  type Student,
  type TeamCheck,
  type TeacherErrors,
  type TeacherFields,
  type Teams,
} from "@/components/register/logic";

/**
 * The registration form, for a school.
 *
 * Three steps. The school's Teacher In-Charge and the events it is entering;
 * then a team for each of those events, one tab per event, with exactly the
 * number of places that event takes; then a last look at who is going to
 * which event before anything is sent. A student can compete in only one
 * event, so the same student entered twice is caught here rather than at the
 * registration desk.
 *
 * Each event goes to the backend as an entry of its own, with its own
 * registration id, so one event failing never costs the others and sending
 * again is always safe: an event that already went through comes back as a
 * duplicate carrying its original id. src/lib/registrations.ts decides where
 * the entries go; this file only reads back an id, or a reason there is none.
 *
 * There is still no fake success path. Until a backend is configured the form
 * checks everything and says plainly that entries are not open yet.
 */

type Step = 0 | 1 | 2;

/**
 * Everything entered so far.
 *
 * The site swaps between its desktop and phone layouts live, on a resize or a
 * rotation: snapping a laptop window to half the screen is enough, and so is
 * a full-page screenshot. The swap unmounts this form. The register route
 * holds this across it, so a school's teams do not go with it, while leaving
 * the page still starts the next visit clean. None of it is stored anywhere.
 */
export type RegisterDraft = {
  step: Step;
  values: TeacherFields;
  picked: string[];
  teams: Teams;
  active: string | null;
  tried: { details: boolean; teams: boolean };
  outcomes: Record<string, EventOutcome>;
  done: boolean;
};

const STEP_TITLES = ["Teacher In-Charge and events", "Assign students", "Review and submit"];

/** A student as the review and the tabs show them: "Aarav Sharma · Class 10". */
const studentLine = (s: Student) => `${s.name.trim()} · Class ${s.grade}`;

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

  const [step, setStep] = useState<Step>(saved?.step ?? 0);
  const [values, setValues] = useState<TeacherFields>(
    saved?.values ?? { teacher: "", school: "", phone: "", email: "" },
  );
  /*
   * The events are a list: a school enters several, each with its own team.
   * Kept out of `values` because that is a map of strings, trimmed on submit,
   * and a set of chosen ids is not a form field's value.
   */
  const [picked, setPicked] = useState<string[]>(
    saved?.picked ?? (preselectedEvent ? [preselectedEvent] : []),
  );
  const [teams, setTeams] = useState<Teams>(saved?.teams ?? {});
  const [active, setActive] = useState<string | null>(saved?.active ?? preselectedEvent ?? null);
  const [errors, setErrors] = useState<TeacherErrors>({});
  /** Errors show once a step has been tried, not while it is being filled in. */
  const [tried, setTried] = useState(saved?.tried ?? { details: false, teams: false });
  /** Set once everything checks out while entries are still closed. */
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  /** Each event's answer from the backend, kept across a retry. */
  const [outcomes, setOutcomes] = useState<Record<string, EventOutcome>>(saved?.outcomes ?? {});
  const [done, setDone] = useState(saved?.done ?? false);
  /** Honeypot. Hidden from people and assistive tech; bots fill it in. */
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (draft) draft.current = { step, values, picked, teams, active, tried, outcomes, done };
  }, [draft, step, values, picked, teams, active, tried, outcomes, done]);

  /**
   * Focus moves once the next render is on screen: to the step's heading when
   * a step opens, or to the field that needs fixing. A counter, so asking
   * for the same element twice in a row still moves focus the second time.
   */
  const [focusAsk, setFocusAsk] = useState({ id: "", n: 0 });
  const focusLater = (id: string) => setFocusAsk((ask) => ({ id, n: ask.n + 1 }));
  useEffect(() => {
    if (!focusAsk.id) return;
    const el = document.getElementById(focusAsk.id);
    if (!el) return;
    if (el.dataset["stepHeading"] !== undefined) {
      window.scrollTo({ top: 0, behavior: "auto" });
      el.focus({ preventScroll: true });
    } else {
      el.focus();
    }
  }, [focusAsk]);

  // The events in the order they are listed, whatever order they were ticked.
  const chosen = events.filter((event) => picked.includes(event.id));
  const checks = checkTeams(picked, teams);
  const activeEvent = chosen.find((event) => event.id === active) ?? chosen[0];

  const set = (key: keyof TeacherFields) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setChecked(false);
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const setStudent =
    (eventId: string, index: number, key: keyof Student) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setTeams((all) => ({
        ...all,
        [eventId]: places(eventId, all).map((s, i) => (i === index ? { ...s, [key]: value } : s)),
      }));
      setChecked(false);
    };

  const openStep = (next: Step, focus = "register-step") => {
    setStep(next);
    focusLater(focus);
  };

  /** The field to fix first in an event's team: a flagged one, else the first empty place. */
  const firstProblem = (eventId: string) => {
    const check = checks[eventId];
    const flagged = check?.places.findIndex((p) => p.name || p.grade) ?? -1;
    if (flagged >= 0) {
      const which = check?.places[flagged]?.name ? "name" : "grade";
      return `field-student-${eventId}-${flagged}-${which}`;
    }
    const empty = places(eventId, teams).findIndex((s) => !s.name.trim() || !s.grade);
    return `field-student-${eventId}-${Math.max(empty, 0)}-name`;
  };

  const detailsProblem = (found: TeacherErrors) => {
    const bad = TEACHER_ORDER.find((key) => found[key]);
    if (bad) return `field-${bad}`;
    if (found.events) return `field-event-${events[0]!.id}`;
    return null;
  };

  const toTeams = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateTeacher(values, picked);
    setErrors(found);
    setTried((t) => ({ ...t, details: true }));
    const bad = detailsProblem(found);
    if (bad) return focusLater(bad);
    if (!active || !picked.includes(active)) setActive(chosen[0]?.id ?? null);
    openStep(1);
  };

  const toReview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried((t) => ({ ...t, teams: true }));
    const first = chosen.find((event) => !checks[event.id]?.done);
    if (first) {
      setActive(first.id);
      return focusLater(firstProblem(first.id));
    }
    openStep(2);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Both earlier steps again: this is the last check before anything goes.
    const found = validateTeacher(values, picked);
    const bad = detailsProblem(found);
    if (bad) {
      setErrors(found);
      setTried((t) => ({ ...t, details: true }));
      return openStep(0, bad);
    }
    const first = chosen.find((event) => !checks[event.id]?.done);
    if (first) {
      setTried((t) => ({ ...t, teams: true }));
      setActive(first.id);
      return openStep(1, firstProblem(first.id));
    }

    if (!registrationOpen) {
      // Nothing to submit to yet, but the form still says whether what has
      // been typed would pass. Disabling the button instead would make the
      // notice at the top a lie.
      setChecked(true);
      return focusLater("register-checked");
    }

    if (sending) return;
    setSending(true);
    // Only the events not already through, on a retry after a partial failure.
    const pending = chosen.filter((event) => !outcomes[event.id]?.reply?.ok).map((ev) => ev.id);
    void submitEach(buildTeamPayloads(values, pending, teams, website))
      .then((results) => {
        const merged = { ...outcomes };
        for (const result of results) merged[result.event] = result;
        setOutcomes(merged);
        if (chosen.every((event) => merged[event.id]?.reply?.ok)) {
          setDone(true);
          focusLater("register-receipt");
        } else {
          focusLater("register-send-error");
        }
      })
      .finally(() => setSending(false));
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = chosen.findIndex((event) => event.id === activeEvent?.id);
    const last = chosen.length - 1;
    const next =
      e.key === "ArrowRight"
        ? at === last
          ? 0
          : at + 1
        : e.key === "ArrowLeft"
          ? at === 0
            ? last
            : at - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    const target = next < 0 ? undefined : chosen[next];
    if (!target) return;
    e.preventDefault();
    setActive(target.id);
    focusLater(`tab-${target.id}`);
  };

  if (done) {
    const repeats = chosen.every((event) => {
      const reply = outcomes[event.id]?.reply;
      return reply?.ok && reply.duplicate;
    });
    return (
      <PageShell title="Registered" lede={values.school.trim()} registerChip={false}>
        <div className="receipt">
          <div className="notice notice-ok" role="status" tabIndex={-1} id="register-receipt">
            <strong>
              {repeats ? "These events were already registered." : "Registration received."}
            </strong>
            <span>
              Each event has its own registration ID. Keep them; the organisers will ask for them at
              the desk. The confirmations and reporting times go to {values.email.trim()}.
            </span>
          </div>
          <ul className="receipt-list">
            {chosen.map((event) => {
              const reply = outcomes[event.id]?.reply;
              return (
                <li key={event.id} data-accent={event.accent}>
                  <span className="receipt-event">{event.name}</span>
                  {reply?.ok ? (
                    <span className="receipt-id">
                      {reply.id}
                      {reply.duplicate ? (
                        <span className="receipt-note"> · already registered</span>
                      ) : null}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-accent btn-block"
              onClick={() => {
                setDone(false);
                setOutcomes({});
                setPicked([]);
                setTeams({});
                setActive(null);
                setTried({ details: false, teams: false });
                openStep(0);
              }}
            >
              Register more events for this school
            </button>
            <Link to="/events" className="btn btn-ghost btn-block" data-magnetic>
              Back to the events
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const errorList = TEACHER_ORDER.filter((k) => errors[k]);
  const detailProblems = errorList.length + (errors.events ? 1 : 0);
  const incomplete = chosen.filter((event) => !checks[event.id]?.done);
  const failed = chosen.filter((event) => outcomes[event.id] && !outcomes[event.id]?.reply?.ok);

  return (
    <PageShell
      title="Register"
      lede={`Register your school's teams: enter the Teacher In-Charge's details, tick the events you are entering, then name the students for each one. A student can compete in only one event. Registrations close on ${REGISTRATION_CLOSES.label}.`}
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

      {step === 0 ? (
        <form className="form" onSubmit={toTeams} noValidate>
          <StepHead step={0} />

          {tried.details && detailProblems > 0 ? (
            <div className="form-summary" role="alert">
              <p className="form-summary-title">
                {detailProblems === 1
                  ? "One field needs fixing"
                  : `${detailProblems} fields need fixing`}
              </p>
              <ul>
                {errorList.map((key) => (
                  <li key={key}>
                    <a href={`#field-${key}`}>{errors[key]}</a>
                  </li>
                ))}
                {errors.events ? (
                  <li>
                    <a href={`#field-event-${events[0]!.id}`}>{errors.events}</a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <fieldset className="party party-fields">
            <legend className="party-legend">Teacher In-Charge</legend>
            <div className="field-row">
              <Field
                id="teacher"
                label="Teacher In-Charge Name"
                error={errors.teacher}
                value={values.teacher}
                onChange={set("teacher")}
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
            </div>
            <div className="field-row">
              <Field
                id="phone"
                label="Teacher In-Charge Phone Number"
                type="tel"
                hint="10 digits, reachable on both fest days. No +91 needed."
                error={errors.phone}
                value={values.phone}
                onChange={set("phone")}
                autoComplete="tel"
                required
              />
              <Field
                id="email"
                label="Teacher In-Charge Gmail/Email"
                type="email"
                hint="Each event's confirmation and the reporting times go here."
                error={errors.email}
                value={values.email}
                onChange={set("email")}
                autoComplete="email"
                required
              />
            </div>
          </fieldset>

          <fieldset
            className="field events-field"
            aria-invalid={errors.events ? true : undefined}
            aria-describedby={errors.events ? "error-events hint-events" : "hint-events"}
          >
            <legend>
              Events <RequiredMark />
            </legend>
            <ul className="event-picks">
              {events.map((e) => (
                <li key={e.id}>
                  <label className="event-pick" htmlFor={`field-event-${e.id}`}>
                    <input
                      type="checkbox"
                      id={`field-event-${e.id}`}
                      name="events"
                      value={e.id}
                      checked={picked.includes(e.id)}
                      onChange={(ev) => {
                        const on = ev.currentTarget.checked;
                        setPicked((list) =>
                          on ? [...list, e.id] : list.filter((id) => id !== e.id),
                        );
                        setChecked(false);
                        if (errors.events) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.events;
                            return next;
                          });
                        }
                      }}
                    />
                    <span className="event-pick-body">
                      <span className="event-pick-name">{e.name}</span>
                      <span className="event-pick-team">{e.team}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p id="hint-events" className="field-hint">
              Tick every event your school is entering. Each one gets its own team on the next step,
              and a student can compete in only one event.
            </p>
            <FieldError id="error-events" message={errors.events} />
          </fieldset>

          <div className="form-actions">
            <button type="submit" className="btn btn-accent btn-block">
              Next: assign students
            </button>
            <Link to="/events" className="btn btn-ghost btn-block" data-magnetic>
              Read the event details first
            </Link>
          </div>
        </form>
      ) : null}

      {step === 1 && activeEvent ? (
        <form className="form" onSubmit={toReview} noValidate>
          <StepHead step={1} />
          <p className="field-hint">
            Each event has exactly as many places as its team takes. Switch between events with the
            tabs; what you enter on one stays there while you fill in the others.
          </p>

          {tried.teams && incomplete.length > 0 ? (
            <div className="form-summary" role="alert">
              <p className="form-summary-title">
                {incomplete.length === 1
                  ? "One event needs attention"
                  : `${incomplete.length} events need attention`}
              </p>
              <ul>
                {incomplete.map((event) => {
                  const check = checks[event.id];
                  return (
                    <li key={event.id}>
                      <a
                        href={`#panel-${event.id}`}
                        onClick={(click) => {
                          click.preventDefault();
                          setActive(event.id);
                          focusLater(firstProblem(event.id));
                        }}
                      >
                        {event.name}:{" "}
                        {check && check.short > 0
                          ? shortBy(check.short)
                          : "check the students marked below."}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="team-tabs" role="tablist" aria-label="Your events" onKeyDown={onTabKey}>
            {chosen.map((event) => {
              const selected = event.id === activeEvent.id;
              const complete = Boolean(checks[event.id]?.done);
              return (
                <button
                  key={event.id}
                  type="button"
                  role="tab"
                  id={`tab-${event.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${event.id}`}
                  tabIndex={selected ? 0 : -1}
                  className="team-tab"
                  data-accent={event.accent}
                  data-done={complete || undefined}
                  data-attention={(tried.teams && !complete) || undefined}
                  onClick={() => setActive(event.id)}
                >
                  <span className="team-tab-mark" aria-hidden="true">
                    {complete ? "✓" : ""}
                  </span>
                  {event.name}
                  <span className="sr-only">{complete ? ", complete" : ", needs students"}</span>
                </button>
              );
            })}
          </div>

          <TeamPanel
            key={activeEvent.id}
            eventId={activeEvent.id}
            teams={teams}
            check={checks[activeEvent.id]}
            tried={tried.teams}
            onChange={setStudent}
            next={chosen[chosen.findIndex((event) => event.id === activeEvent.id) + 1]}
            onNext={(id) => {
              setActive(id);
              focusLater(`field-student-${id}-0-name`);
            }}
          />

          <div className="form-actions">
            <button type="submit" className="btn btn-accent btn-block">
              Review registration
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => openStep(0)}>
              Back to Teacher In-Charge and events
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="form" onSubmit={submit} noValidate>
          <StepHead step={2} />
          <p className="field-hint">
            Check which students are going to which event. Use Edit to change anything before you
            submit.
          </p>

          <section className="review-block" aria-labelledby="review-teacher">
            <div className="review-head">
              <h3 id="review-teacher" className="review-title">
                Teacher In-Charge
              </h3>
              <button
                type="button"
                className="review-edit"
                onClick={() => openStep(0, "field-teacher")}
                aria-label="Edit the Teacher In-Charge details"
              >
                Edit
              </button>
            </div>
            <dl className="review-list">
              <div>
                <dt>Name</dt>
                <dd>{values.teacher.trim()}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{values.phone.trim()}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{values.email.trim()}</dd>
              </div>
              <div>
                <dt>School</dt>
                <dd>{values.school.trim()}</dd>
              </div>
            </dl>
          </section>

          <section className="review-block" aria-labelledby="review-events">
            <h3 id="review-events" className="review-title">
              Selected events
            </h3>
            {chosen.map((event) => {
              const outcome = outcomes[event.id];
              const team = places(event.id, teams).filter((s) => s.name.trim() && s.grade);
              return (
                <div key={event.id} className="review-event" data-accent={event.accent}>
                  <div className="review-head">
                    <h4 className="review-event-name">{event.name}</h4>
                    <button
                      type="button"
                      className="review-edit"
                      onClick={() => {
                        setActive(event.id);
                        openStep(1, `tab-${event.id}`);
                      }}
                      aria-label={`Edit the team for ${event.name}`}
                    >
                      Edit
                    </button>
                  </div>
                  <p className="field-hint">
                    {event.team} · {eventDay(event)}
                  </p>
                  <ol className="review-students">
                    {team.map((s, i) => (
                      <li key={i}>{studentLine(s)}</li>
                    ))}
                  </ol>
                  {outcome?.reply?.ok ? (
                    <p className="review-saved">
                      Saved · <strong>{outcome.reply.id}</strong>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </section>

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

          {failed.length > 0 ? (
            <div className="form-summary" role="alert" tabIndex={-1} id="register-send-error">
              <p className="form-summary-title">
                {failed.length === 1
                  ? "One event was not submitted"
                  : `${failed.length} events were not submitted`}
              </p>
              <ul>
                {failed.map((event) => {
                  const reply = outcomes[event.id]?.reply;
                  return (
                    <li key={event.id}>
                      {event.name}:{" "}
                      {reply && !reply.ok
                        ? describeFailure(reply)
                        : "Could not reach the registration server. Check your connection and submit again; your answers are still here."}
                    </li>
                  );
                })}
              </ul>
              <p className="field-hint">
                Events marked Saved above are already registered and are not sent again.
              </p>
            </div>
          ) : null}

          {checked ? (
            <p className="notice notice-ok" role="status" tabIndex={-1} id="register-checked">
              <strong>Your details are complete.</strong>
              <span>
                Nothing has been submitted — entries are not open yet. Come back and submit when
                they are, and keep this page open so you do not retype anything.
              </span>
            </p>
          ) : null}

          <div className="form-actions">
            <SubmitButton
              registrationOpen={registrationOpen}
              sending={sending}
              retry={failed.length}
            />
            <button type="button" className="btn btn-ghost btn-block" onClick={() => openStep(1)}>
              Back to the teams
            </button>
          </div>
        </form>
      ) : null}
    </PageShell>
  );
}

/** "Step 2 of 3", and the step's own name as the heading focus lands on. */
function StepHead({ step }: { step: Step }) {
  return (
    <div className="form-step">
      <p className="form-step-count">
        Step {step + 1} of {STEP_TITLES.length}
      </p>
      <h2 className="form-step-title" id="register-step" tabIndex={-1} data-step-heading>
        {STEP_TITLES[step]}
      </h2>
    </div>
  );
}

/**
 * One event's team: the places it takes, each a student's name and class.
 * There is no way to add or remove a place. The event decides how many
 * there are, and an optional place in an event with a range just says so.
 */
function TeamPanel({
  eventId,
  teams,
  check,
  tried,
  onChange,
  next,
  onNext,
}: {
  eventId: string;
  teams: Teams;
  check: TeamCheck | undefined;
  tried: boolean;
  onChange: (
    eventId: string,
    index: number,
    key: keyof Student,
  ) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  next: QuantumEvent | undefined;
  onNext: (id: string) => void;
}) {
  const event = events.find((e) => e.id === eventId)!;
  const list = places(eventId, teams);
  const solo = event.size.max === 1;
  const short = check?.short ?? event.size.min;

  return (
    <div
      className="team-panel"
      role="tabpanel"
      id={`panel-${eventId}`}
      aria-labelledby={`tab-${eventId}`}
      data-accent={event.accent}
    >
      <h3 className="team-panel-title">Select participants for {event.name}</h3>
      <p className="field-hint">
        {event.team} · {eventDay(event)}
      </p>

      <fieldset className="party">
        <legend className="sr-only">{solo ? "Participant" : "Team members"}</legend>
        {list.map((student, i) => {
          const errs = tried ? check?.places[i] : undefined;
          const label = solo
            ? "Participant"
            : `Team member ${i + 1}${i >= event.size.min ? " (optional)" : ""}`;
          return (
            <div className="party-row" key={i}>
              <div className="party-head">
                <h4 className="party-title">{label}</h4>
              </div>
              <div className="party-grid party-grid-student">
                <Field
                  id={`student-${eventId}-${i}-name`}
                  label="Student's full name"
                  error={errs?.name}
                  value={student.name}
                  onChange={onChange(eventId, i, "name")}
                  autoComplete="off"
                />
                <div className="field">
                  <label htmlFor={`field-student-${eventId}-${i}-grade`}>Class</label>
                  <select
                    id={`field-student-${eventId}-${i}-grade`}
                    name={`student-${eventId}-${i}-grade`}
                    value={student.grade}
                    onChange={onChange(eventId, i, "grade")}
                    aria-invalid={errs?.grade ? true : undefined}
                    aria-describedby={
                      errs?.grade ? `error-student-${eventId}-${i}-grade` : undefined
                    }
                  >
                    <option value="">Choose a class</option>
                    {CLASSES.map((g) => (
                      <option key={g} value={String(g)}>
                        Class {g}
                      </option>
                    ))}
                  </select>
                  <FieldError id={`error-student-${eventId}-${i}-grade`} message={errs?.grade} />
                </div>
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="team-foot">
        {/* Polite: the count changing is worth knowing, not worth interrupting. */}
        <p
          className="team-status"
          data-state={short > 0 ? "short" : "done"}
          data-tried={tried || undefined}
          aria-live="polite"
        >
          {short > 0 ? shortBy(short) : `${event.name} has its full team.`}
        </p>
        {next ? (
          <button type="button" className="btn btn-ghost" onClick={() => onNext(next.id)}>
            Next event: {next.name} →
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SubmitButton({
  registrationOpen,
  sending,
  retry,
}: {
  registrationOpen: boolean;
  sending: boolean;
  retry: number;
}) {
  return (
    <button
      type="submit"
      className={`btn btn-block ${registrationOpen ? "btn-accent" : "btn-ghost"}`}
      disabled={sending}
      aria-busy={sending || undefined}
    >
      {!registrationOpen
        ? "Check my details"
        : sending
          ? "Submitting…"
          : retry > 0
            ? `Submit the ${retry === 1 ? "remaining event" : `remaining ${retry} events`} again`
            : "Submit registration"}
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
