import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { Route } from "@/routes/events";
import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Reveal } from "@/components/scene/Reveal";
import { FEST_DAYS, REGISTRATION_CLOSES, eventDay, events, getScene } from "@/data/quantum";
import { StickyCard002, type StackCard } from "@/components/ui/skiper-ui/skiper17";

/**
 * Events: the six as a stack of cards.
 *
 * Each card carries the whole entry — tagline, description, who can enter,
 * when, the round-by-round format and the registration link — so there is one
 * place per event. Scrolling slides the next card up over the last. A row of
 * buttons under the stack reaches any of them directly, and is the way in for
 * a keyboard.
 *
 * The event in front is mirrored into `?event=<id>` so a single event can be
 * linked to and shared. History is replaced rather than pushed: scrolling
 * through the stack should not fill up the back button.
 */

/**
 * Panel art for the rail. There are no event photographs and there will not be
 * any before the fest runs, so each panel is lit from its event's own accent
 * instead, which is the channel the rest of the site keys that event to.
 */
const PANEL_CYAN =
  "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-cyan) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.06 215), oklch(0.16 0.03 250))";

const PANEL: Record<string, string> = {
  cyan: PANEL_CYAN,
  magenta:
    "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-magenta) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.08 325), oklch(0.16 0.03 290))",
  violet:
    "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-violet) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.07 280), oklch(0.16 0.03 265))",
};

export function EventsInterior() {
  const scene = getScene("events")!;
  const { event: fromUrl } = Route.useSearch();
  const navigate = useNavigate();

  // Read once, at mount. The stack owns its position from then on, and the
  // URL is rewritten in place rather than pushed, so there are no history
  // entries for a later read to disagree with.
  const landed = events.findIndex((e) => e.id === fromUrl);
  const start = landed < 0 ? 0 : landed;

  // Built here rather than at module scope so the registration link can go
  // through the router. It keeps its href, so it is still a real link to
  // right-click, copy or open in a new tab — the click is simply intercepted
  // so choosing an event does not reload the whole document.
  const cards = useMemo<StackCard[]>(
    () =>
      events.map((event, i) => ({
        id: event.id,
        name: event.name,
        accent: event.accent,
        background: PANEL[event.accent] ?? PANEL_CYAN,
        content: (
          <>
            <div className="rail-caption stack-caption" data-accent={event.accent}>
              <span className="stack-count" aria-hidden="true">
                {String(i + 1).padStart(2, "0")} / {String(events.length).padStart(2, "0")}
              </span>
              <h3 className="rail-mark">{event.name}</h3>
              <p className="rail-tagline">{event.tagline}</p>
              <p className="rail-blurb">{event.description}</p>
            </div>
            <div className="stack-side" data-accent={event.accent}>
              <div className="rail-detail">
                <p className="rail-team">
                  <span className="rail-team-label">Entry</span>
                  {event.team}
                </p>
                <p className="rail-team">
                  <span className="rail-team-label">When</span>
                  {eventDay(event)}
                </p>
                <h4 className="rail-format-title">How it runs</h4>
                <ol className="rail-format">
                  {event.format.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </div>
              <a
                href={`/register?event=${event.id}`}
                className="btn btn-accent"
                data-magnetic
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  void navigate({ to: "/register", search: { event: event.id } });
                }}
              >
                Register for {event.name}
              </a>
            </div>
          </>
        ),
      })),
    [navigate],
  );

  const onIndexChange = useCallback(
    (index: number) => {
      const event = events[index];
      if (!event) return;
      void navigate({
        to: "/events",
        search: { event: event.id },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  return (
    <InteriorShell
      scene={scene}
      leadBelow
      lead={`Six events run across two days: the online events on ${FEST_DAYS.online.label} and the rest at the school on ${FEST_DAYS.offline.label}. Every one is scored the same way and carries the same weight, so cumulative points across all six decide the overall school champion.`}
    >
      <section className="rail" aria-labelledby="rail-head">
        <h2 id="rail-head" className="page-subhead">
          The six events
        </h2>
        <StickyCard002
          cards={cards}
          startIndex={start}
          onIndexChange={onIndexChange}
          label="The six events"
          hint="Scroll to move through the events"
        />
      </section>

      <Reveal as="section" className="room-cta" aria-labelledby="events-cta">
        <h2 id="events-cta" className="room-subhead">
          Picked your events?
        </h2>
        <p className="room-cta-note">
          Each student can compete in only one event, so a school entering several events sends a
          different team to each and lists every team under its event on the registration form.
          Registrations close on {REGISTRATION_CLOSES.label}.
        </p>
        <div className="page-actions">
          <Link to="/register" className="btn btn-accent" data-magnetic>
            Register for the events
          </Link>
          <Link to="/faq" className="btn btn-ghost" data-magnetic>
            Read the FAQ first
          </Link>
        </div>
      </Reveal>
    </InteriorShell>
  );
}
