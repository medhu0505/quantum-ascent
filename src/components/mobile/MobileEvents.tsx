import { useNavigate } from "@tanstack/react-router";
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { MobileShell, ScreenHead, ScreenLink } from "@/components/mobile/MobileShell";
import { railStop, useDragScroll } from "@/components/mobile/useDragScroll";
import { FEST_DAYS, REGISTRATION_CLOSES, eventDay, events, getScene } from "@/data/quantum";

/**
 * Events on a phone: the six as a rail of cards you swipe, or drag with a
 * mouse, with the one at rest opened out underneath: who can enter, how the
 * rounds run, and the way into registering for it.
 *
 * The event at rest is mirrored into `?event=<id>`, the same address the
 * desktop rail uses, so a single event can be linked to from either. History
 * is replaced, not pushed: swiping along a rail should not fill up the back
 * button.
 */

const count = (i: number) =>
  `${String(i + 1).padStart(2, "0")} / ${String(events.length).padStart(2, "0")}`;

export function MobileEvents({ initial }: { initial?: string | undefined }) {
  const navigate = useNavigate();
  const rail = useRef<HTMLDivElement | null>(null);
  const landed = events.findIndex((e) => e.id === initial);
  const [active, setActive] = useState(landed < 0 ? 0 : landed);
  const event = events[active] ?? events[0]!;

  const mirror = useCallback(
    (index: number) => {
      const id = events[index]?.id;
      if (!id) return;
      void navigate({ to: "/events", search: { event: id }, replace: true, resetScroll: false });
    },
    [navigate],
  );

  const settle = useCallback(
    (index: number) => {
      setActive(index);
      mirror(index);
    },
    [mirror],
  );

  useDragScroll(rail, settle);

  // Arrive on the event in the address, already at rest, before first paint.
  // Only on arrival: after that the rail owns its position.
  const arrival = useRef(landed);
  useLayoutEffect(() => {
    const el = rail.current;
    if (el && arrival.current > 0) el.scrollLeft = railStop(el, arrival.current);
  }, []);

  const go = (index: number) => {
    const el = rail.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: railStop(el, index), behavior: still ? "auto" : "smooth" });
    settle(index);
  };

  // Which card is at rest, read off the scroll position as it moves.
  const onScroll = () => {
    const el = rail.current;
    if (!el || el.dataset["dragging"] !== undefined) return;
    const first = el.children[0] as HTMLElement | undefined;
    const second = el.children[1] as HTMLElement | undefined;
    if (!first) return;
    const step = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    const index = Math.max(0, Math.min(events.length - 1, Math.round(el.scrollLeft / step)));
    if (index !== active) settle(index);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = Math.max(
        0,
        Math.min(events.length - 1, active + (e.key === "ArrowRight" ? 1 : -1)),
      );
      go(next);
      (rail.current?.children[next] as HTMLElement | undefined)?.focus();
    }
  };

  return (
    <MobileShell screen="events">
      <ScreenHead image={getScene("events")!.view!} title="Events" />

      <div className="m-rail-head">
        <h2 className="m-h2">The six events</h2>
        <span className="m-counter" aria-hidden="true">
          {count(active)}
        </span>
      </div>

      <div
        ref={rail}
        className="m-rail"
        role="group"
        aria-roledescription="carousel"
        aria-label="The six events"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        {events.map((e, i) => (
          <button
            key={e.id}
            type="button"
            className="m-event-card"
            data-accent={e.accent}
            aria-current={i === active || undefined}
            aria-label={`${e.name}, ${count(i)}`}
            onClick={() => go(i)}
          >
            <span className="m-lines" aria-hidden="true" />
            <span className="m-event-num" aria-hidden="true">
              {count(i)}
            </span>
            <span className="m-event-team">{e.team}</span>
            <span className="m-event-name">{e.name}</span>
            <span className="m-event-tag">{e.tagline}</span>
            <span className="m-event-desc">{e.description}</span>
          </button>
        ))}
      </div>

      <div className="m-dots" role="group" aria-label="Choose an event">
        {events.map((e, i) => (
          <button
            key={e.id}
            type="button"
            className="m-dot"
            data-accent={e.accent}
            aria-label={e.name}
            aria-current={i === active || undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>

      {/* Announced when the event at rest changes, so a screen reader hears
          which one it is rather than only that something moved. */}
      <p className="sr-only" aria-live="polite">
        {event.name}: {event.team}, {eventDay(event)}
      </p>

      <section className="m-panel m-event-panel" data-accent={event.accent}>
        <h3 className="sr-only">{event.name}</h3>
        <p className="m-entry">
          <span className="m-entry-key">Entry</span>
          {event.team}
        </p>
        <p className="m-entry">
          <span className="m-entry-key">When</span>
          {eventDay(event)}
        </p>
        <h4 className="m-h4">How it runs</h4>
        <ol className="m-steps-list">
          {event.format.map((step, i) => (
            <li key={step}>
              <span className="m-steps-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <ScreenLink
          to="/register"
          search={{ event: event.id }}
          className="m-btn m-btn-accent"
          data-accent={event.accent}
        >
          Register for {event.name} →
        </ScreenLink>
      </section>

      <section className="m-pad m-after">
        <h2 className="m-h2 m-h2-lg">Picked your events?</h2>
        <p className="m-muted m-body">
          Each student can compete in only one event, so a school entering several events sends a
          different team to each and registers every team on its own. Registrations close on{" "}
          {REGISTRATION_CLOSES.label}.
        </p>
        <ScreenLink to="/faq" className="m-btn m-btn-ghost">
          Read the FAQ first
        </ScreenLink>
        <p className="m-muted m-small">
          Six events run across two days: the online events on {FEST_DAYS.online.label} and the rest
          at the school on {FEST_DAYS.offline.label}. Every one is scored the same way and carries
          the same weight, so cumulative points across all six decide the overall school champion.
        </p>
      </section>
    </MobileShell>
  );
}
