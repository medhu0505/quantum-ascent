import { MobileShell, ScreenLink } from "@/components/mobile/MobileShell";
import {
  BROCHURE_URL,
  contact,
  crossroadsPlate,
  events,
  fest,
  getScene,
  isTodo,
  scenes,
  school,
} from "@/data/quantum";
import { usePreloadWhenIdle } from "@/lib/preload";
import { telHref } from "@/lib/utils";

/**
 * The street: the phone app's crossroads.
 *
 * On a wide screen the crossroads is a film you fall into and billboards you
 * walk through. A phone gets the same street as one still, and the billboards
 * become the cards under it, lit the way the boards are lit: accent glass, a
 * neon edge, the scanlines of the screens in the film.
 */

function Street({
  to,
  label,
  blurb,
  accent,
  wide = false,
  count,
}: {
  to: string;
  label: string;
  blurb: string;
  accent: "cyan" | "magenta" | "violet";
  wide?: boolean;
  count?: string;
}) {
  return (
    <ScreenLink to={to} className="m-street" data-accent={accent} data-wide={wide || undefined}>
      <span className="m-street-lines" aria-hidden="true" />
      {wide ? <span className="m-street-sweep" aria-hidden="true" /> : null}
      {count ? (
        <span className="m-street-count" aria-hidden="true">
          {count} →
        </span>
      ) : null}
      <span className="m-street-label">{label}</span>
      <span className="m-street-blurb">{blurb}</span>
    </ScreenLink>
  );
}

/** The screens the street's cards open, and the photograph each opens on. */
const SCREENS = scenes.filter((scene) => scene.href === undefined);
const SCREEN_PATHS = SCREENS.map((scene) => scene.to);
const SCREEN_VIEWS = SCREENS.flatMap((scene) => (scene.view ? [scene.view] : []));

export function MobileStreet() {
  const brochure = getScene("brochure")!;
  const brochurePending = isTodo(BROCHURE_URL);
  // A tap never hovers, so nothing else loads a screen before it is asked for.
  usePreloadWhenIdle(SCREEN_PATHS, SCREEN_VIEWS);

  return (
    <MobileShell screen="street">
      <header className="m-hero">
        <img
          className="m-hero-img"
          src={crossroadsPlate.webp}
          alt={crossroadsPlate.alt}
          width={crossroadsPlate.width}
          height={crossroadsPlate.height}
          fetchPriority="high"
        />
        <div className="m-lines" aria-hidden="true" />
        <div className="m-hero-fade" aria-hidden="true" />
        <div className="m-hero-text">
          <p className="m-eyebrow">{fest.kind}</p>
          <h1 className="m-hero-title">
            <span className="m-gradient-text">{fest.name}</span>
            <span className="sr-only"> {fest.edition}</span>
          </h1>
          <p className="m-hero-school">
            {school.name} · {school.city}
          </p>
        </div>
      </header>

      <div className="m-pad">
        <h2 className="m-kicker">Pick a street</h2>
        <nav aria-label="Quantum V2.0 sections" className="m-street-grid">
          <Street
            to="/events"
            label={getScene("events")!.label}
            blurb={getScene("events")!.blurb}
            accent="cyan"
            wide
            count={`${String(events.length).padStart(2, "0")} events`}
          />
          <Street
            to="/register"
            label={getScene("register")!.label}
            blurb={getScene("register")!.blurb}
            accent="magenta"
          />
          <Street
            to="/team"
            label={getScene("team")!.label}
            blurb={getScene("team")!.blurb}
            accent="cyan"
          />
          <Street
            to="/resources"
            label={getScene("resources")!.label}
            blurb={getScene("resources")!.blurb}
            accent="violet"
          />
          {/* A card that opens nothing until there is a PDF to open. */}
          {brochurePending ? (
            <div className="m-street" data-accent="violet" data-pending aria-disabled="true">
              <span className="m-street-lines" aria-hidden="true" />
              <span className="m-street-label">{brochure.label}</span>
              <span className="m-street-blurb">To be confirmed.</span>
            </div>
          ) : (
            <a
              className="m-street"
              data-accent="violet"
              href={BROCHURE_URL}
              target="_blank"
              rel="noreferrer"
            >
              <span className="m-street-lines" aria-hidden="true" />
              <span className="m-street-label">{brochure.label}</span>
              <span className="m-street-blurb">{brochure.blurb}</span>
            </a>
          )}
        </nav>

        <footer className="m-foot">
          <p className="m-foot-mark">
            <span className="m-gradient-text">{fest.name}</span>
          </p>
          <p className="m-muted">
            {contact.name} · {contact.role}
          </p>
          <p>
            <a href={telHref(contact.phone)}>{contact.phone}</a>
          </p>
          <p>
            <ScreenLink to="/contact">Event contacts</ScreenLink>
          </p>
          <p>
            <a href={contact.instagramUrl} target="_blank" rel="noreferrer">
              Instagram {contact.instagram}
            </a>
          </p>
        </footer>
      </div>
    </MobileShell>
  );
}
