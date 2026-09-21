import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { Route } from "@/routes/events";
import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Reveal } from "@/components/scene/Reveal";
import { events, getScene } from "@/data/quantum";
import { SqueezeCarousel, type SqueezeSlide } from "@/components/ui/carousel-squeeze";

/**
 * Events: one rail carrying all six.
 *
 * This was a rail of summaries above a wall of expandable screens, which meant
 * every event was written twice and the same six names had to be read twice
 * before anything could be compared. The rail now carries the whole entry —
 * tagline, description, team size, the round-by-round format and the
 * registration link — so there is one place per event rather than two, and
 * opening one closes the last without anything collapsing under the scroll
 * position.
 *
 * The open event is mirrored into `?event=<id>` so a single event can be
 * linked to and shared. History is replaced rather than pushed: stepping along
 * a carousel should not fill up the back button.
 *
 * Name, tagline and description are painted onto the open panel; entry, format
 * and the registration link sit under the rail. The same words stay in the
 * paragraph below as well, where the live region reads them out on a change
 * and where a viewport too narrow for a caption falls back to them.
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

  // Read once, at mount. The carousel owns its position from then on, and the
  // URL is rewritten in place rather than pushed, so there are no history
  // entries for a later read to disagree with.
  const landed = events.findIndex((e) => e.id === fromUrl);
  const start = landed < 0 ? 0 : landed;

  // Built here rather than at module scope so the registration link can go
  // through the router. It keeps its href, so it is still a real link to
  // right-click, copy or open in a new tab — the click is simply intercepted
  // so choosing an event does not reload the whole document.
  const rail = useMemo<SqueezeSlide[]>(
    () =>
      events.map((event) => ({
        id: event.id,
        title: `${event.name}. ${event.tagline}`,
        description: event.description,
        background: PANEL[event.accent] ?? PANEL_CYAN,
        // Painted on the panel itself rather than read underneath it. The
        // panels are lit gradients with nothing in them, so all that space was
        // going to waste while the entry it belongs to sat below the rail.
        caption: (
          <span className="rail-caption" data-accent={event.accent}>
            <span className="rail-mark">{event.name}</span>
            <span className="rail-tagline">{event.tagline}</span>
            <span className="rail-blurb">{event.description}</span>
          </span>
        ),
        details: (
          <div className="rail-detail" data-accent={event.accent}>
            <p className="rail-team">
              <span className="rail-team-label">Entry</span>
              {event.team}
            </p>
            <h3 className="rail-format-title">How it runs</h3>
            <ol className="rail-format">
              {event.format.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        ),
        action: `Register for ${event.name}`,
        href: `/register/form?event=${event.id}`,
        onAction: (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          void navigate({ to: "/register/form", search: { event: event.id } });
        },
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
      lead="Six events run across the day. Every one is scored the same way and carries the same weight, so cumulative points across all six decide the overall school champion."
    >
      <section className="rail" aria-labelledby="rail-head">
        <h2 id="rail-head" className="page-subhead">
          The six events
        </h2>
        <SqueezeCarousel
          slides={rail}
          defaultIndex={start}
          onIndexChange={onIndexChange}
          label="The six events"
          hint="Swipe, or use the arrows, to switch events"
          height="clamp(180px, 30cqi, 320px)"
          /* The tail cards are links. At the component's 8px default they
             were 8px-wide click targets carrying no readable edge — a pair
             of hairlines at the end of the row rather than cards waiting
             their turn. */
          slatWidth={26}
          accent="var(--neon-cyan)"
          accentForeground="#05070d"
        />
      </section>

      <Reveal as="section" className="room-cta" aria-labelledby="events-cta">
        <h2 id="events-cta" className="room-subhead">
          Picked your events?
        </h2>
        <p className="room-cta-note">
          One form covers all six. Enter as many as you can physically attend — just check that the
          rounds do not clash before you commit.
        </p>
        <div className="page-actions">
          <Link to="/register/form" className="btn btn-accent" data-magnetic>
            Register your school
          </Link>
          <Link to="/faq" className="btn btn-ghost" data-magnetic>
            Read the FAQ first
          </Link>
        </div>
      </Reveal>
    </InteriorShell>
  );
}
