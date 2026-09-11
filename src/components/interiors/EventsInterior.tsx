import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Route } from "@/routes/events";
import { InteriorShell } from "@/components/interiors/InteriorShell";
import { Reveal } from "@/components/scene/Reveal";
import { events, getScene } from "@/data/quantum";
import { SqueezeCarousel, type SqueezeSlide } from "@/components/ui/carousel-squeeze";

/**
 * Events: one screen per event, each its own hotspot.
 *
 * The screens are the hotspots — the element and the target are the same
 * object, so focus order, hit area and accessible name need no separate
 * bookkeeping. Each screen is a disclosure rather than a route: six events is
 * not enough content to justify six pages, and collapsing the detail keeps
 * the wall of screens scannable instead of six columns of body copy.
 *
 * Each opened screen carries its own registration link with the event
 * preselected, so browsing and signing up are one move rather than two.
 *
 * The open screen is mirrored into `?event=<id>` so a single event can be
 * linked to and shared. History is replaced rather than pushed: opening and
 * closing screens should not fill up the back button.
 */
/**
 * Panel art for the rail. There are no event photographs and there will not be
 * any before the fest runs, so each panel is lit from its event's own accent
 * instead — which is the same channel the screen below it is keyed to, so the
 * rail and the grid read as one thing rather than two.
 */
const PANEL_CYAN =
  "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-cyan) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.06 215), oklch(0.16 0.03 250))";

const PANEL: Record<string, string> = {
  cyan: "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-cyan) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.06 215), oklch(0.16 0.03 250))",
  magenta:
    "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-magenta) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.08 325), oklch(0.16 0.03 290))",
  violet:
    "radial-gradient(120% 140% at 22% 12%, color-mix(in oklab, var(--neon-violet) 52%, transparent), transparent 68%), linear-gradient(155deg, oklch(0.28 0.07 280), oklch(0.16 0.03 265))",
};

const rail: SqueezeSlide[] = events.map((event) => ({
  id: event.id,
  title: `${event.name}. ${event.tagline}`,
  description: event.description,
  background: PANEL[event.accent] ?? PANEL_CYAN,
  overlay: <span className="rail-mark">{event.name}</span>,
  action: `Register for ${event.name}`,
  href: `/register/form?event=${event.id}`,
}));

export function EventsInterior() {
  const scene = getScene("events")!;
  const { event: fromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(fromUrl ?? null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Arriving on a shared link should land on the screen that was shared.
  useEffect(() => {
    if (!fromUrl) return;
    setOpen(fromUrl);
    const el = panelRefs.current[fromUrl];
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }, [fromUrl]);

  const toggle = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    void navigate({
      to: "/events",
      search: next ? { event: next } : {},
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <InteriorShell
      scene={scene}
      lead="Six events run across the day. Every one is scored the same way and carries the same weight, so cumulative points across all six decide the overall school champion."
    >
      <section className="rail" aria-labelledby="rail-head">
        <h2 id="rail-head" className="page-subhead">
          The six, at a glance
        </h2>
        <SqueezeCarousel
          slides={rail}
          label="The six events"
          height="clamp(180px, 30cqi, 320px)"
          accent="var(--neon-cyan)"
          accentForeground="#05070d"
        />
      </section>

      <h2 className="page-subhead">Every event in full</h2>

      <ul className="screen-grid">
        {events.map((event, i) => {
          const isOpen = open === event.id;
          return (
            <Reveal as="li" key={event.id} delay={i} data-accent={event.accent}>
              <div className="screen-shell">
                <button
                  type="button"
                  className="screen"
                  aria-expanded={isOpen}
                  aria-controls={`event-panel-${event.id}`}
                  onClick={() => toggle(event.id)}
                >
                  <span className="screen-index">Screen {String(i + 1).padStart(2, "0")}</span>
                  <span className="screen-title">{event.name}</span>
                  <span className="screen-tagline">{event.tagline}</span>
                  <span className="screen-team">{event.team}</span>
                  <span className="screen-more" aria-hidden="true">
                    {isOpen ? "Hide details" : "Show details"}
                  </span>
                </button>

                <div
                  id={`event-panel-${event.id}`}
                  className="screen-panel"
                  ref={(el) => {
                    panelRefs.current[event.id] = el;
                  }}
                  hidden={!isOpen}
                >
                  <p className="screen-body">{event.description}</p>
                  <h3 className="screen-format-title">How it runs</h3>
                  <ul className="screen-format">
                    {event.format.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <Link
                    to="/register/form"
                    search={{ event: event.id }}
                    className="btn btn-accent"
                    data-magnetic
                  >
                    Register for {event.name}
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>

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
