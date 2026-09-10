import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { InteriorShell } from "@/components/interiors/InteriorShell";
import { events, getScene } from "@/data/quantum";

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
 */
export function EventsInterior() {
  const scene = getScene("events")!;
  const [open, setOpen] = useState<string | null>(null);

  return (
    <InteriorShell
      scene={scene}
      lead="Six events run across the day. Every one is scored the same way and carries the same weight, so cumulative points across all six decide the overall school champion."
    >
      <ul className="screen-grid">
        {events.map((event, i) => {
          const isOpen = open === event.id;
          return (
            <li key={event.id} data-accent={event.accent}>
              <div className="screen-shell">
                <button
                  type="button"
                  className="screen"
                  aria-expanded={isOpen}
                  aria-controls={`event-panel-${event.id}`}
                  onClick={() => setOpen(isOpen ? null : event.id)}
                >
                  <span className="screen-index">Screen {String(i + 1).padStart(2, "0")}</span>
                  <span className="screen-title">{event.name}</span>
                  <span className="screen-tagline">{event.tagline}</span>
                  <span className="screen-team">{event.team}</span>
                  <span className="screen-more" aria-hidden="true">
                    {isOpen ? "Hide details" : "Show details"}
                  </span>
                </button>

                <div id={`event-panel-${event.id}`} className="screen-panel" hidden={!isOpen}>
                  <p className="screen-body">{event.description}</p>
                  <h3 className="screen-format-title">How it runs</h3>
                  <ul className="screen-format">
                    {event.format.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <Link to="/register/form" search={{ event: event.id }} className="btn btn-accent">
                    Register for {event.name}
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </InteriorShell>
  );
}
