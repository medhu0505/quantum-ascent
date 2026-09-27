import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
import { isRegistrationOpen } from "@/lib/registrations";

/**
 * The phone app's frame: the pill at the top, the title that settles into a
 * bar once the page has scrolled, and the dock along the bottom.
 *
 * Every screen is a real route, so the back button, a shared link and a
 * reload all land where they should, and the desktop site answers the same
 * addresses on a wide screen.
 */

export type MobileScreen = "street" | "events" | "register" | "team" | "resources";

const TITLES: Record<MobileScreen, string> = {
  street: "Quantum V2.0",
  events: "Events",
  register: "Register",
  team: "Meet the Team",
  resources: "Resources",
};

type Accent = "cyan" | "magenta" | "violet";

const DOCK: { screen: MobileScreen; to: string; label: string; accent: Accent }[] = [
  { screen: "street", to: "/", label: "Street", accent: "cyan" },
  { screen: "events", to: "/events", label: "Events", accent: "cyan" },
  { screen: "register", to: "/register", label: "Register", accent: "magenta" },
  { screen: "team", to: "/team", label: "Team", accent: "cyan" },
  { screen: "resources", to: "/resources", label: "Info", accent: "violet" },
];

/** How far the page scrolls before the title settles into the bar. */
const TITLE_AFTER_PX = 150;

function useScrolledPast(px: number): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setPast(window.scrollY > px);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [px]);
  return past;
}

/**
 * A link between screens. It fades the page out to the street and lifts the
 * next one in, and a tap on the screen already showing goes back to its top
 * instead of doing nothing.
 */
export function ScreenLink({
  to,
  search,
  onClick,
  ...rest
}: Omit<ComponentProps<"a">, "href" | "target" | "ref"> & {
  to: string;
  search?: Record<string, string>;
}) {
  const onScreen = useRouterState({
    select: (state) => (state.resolvedLocation ?? state.location).pathname,
  });
  const phase = usePhaseLink(to, search ? { mode: "screen", search } : { mode: "screen" });

  return (
    <Link
      to={to}
      {...(search ? { search } : {})}
      {...rest}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (to === onScreen && !search) {
          event.preventDefault();
          const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
          return;
        }
        phase(event);
      }}
    />
  );
}

function LivePill() {
  const open = isRegistrationOpen();
  return (
    <ScreenLink to="/register" className="m-pill m-pill-live" data-open={open || undefined}>
      <span className="m-live-dot" aria-hidden="true" />
      {open ? "Registrations live" : "Entries open soon"}
    </ScreenLink>
  );
}

function BackPill({ short }: { short: boolean }) {
  return (
    <ScreenLink to="/" className="m-pill" aria-label="Back to Home">
      <span aria-hidden="true">←</span>
      <span aria-hidden="true">{short ? "Home" : "Back to Home"}</span>
    </ScreenLink>
  );
}

function Dock({ current }: { current: MobileScreen }) {
  return (
    <nav className="m-dock" aria-label="Quick navigation">
      {DOCK.map((item) => (
        <ScreenLink
          key={item.screen}
          to={item.to}
          className="m-dock-item"
          data-accent={item.accent}
          data-register={item.screen === "register" || undefined}
          aria-current={item.screen === current ? "page" : undefined}
        >
          <span>{item.label}</span>
          <span className="m-dock-bar" aria-hidden="true" />
        </ScreenLink>
      ))}
    </nav>
  );
}

export function MobileShell({ screen, children }: { screen: MobileScreen; children: ReactNode }) {
  const scrolled = useScrolledPast(TITLE_AFTER_PX);
  const street = screen === "street";

  return (
    <div className="m-app" data-screen={screen}>
      {/* The page's own heading is the title for a screen reader; this bar is
          the same words, settled at the top once that heading has scrolled
          away. */}
      <div className="m-titlebar" data-on={(!street && scrolled) || undefined} aria-hidden="true">
        <span>{TITLES[screen]}</span>
      </div>
      <header className="m-top">{street ? <LivePill /> : <BackPill short={scrolled} />}</header>

      <main id="main" className="m-main" tabIndex={-1}>
        {children}
      </main>

      {/* Register has its own bar along the bottom for the steps. */}
      {screen === "register" ? null : <Dock current={screen} />}
    </div>
  );
}

/** A screen's header: a slice of the room it stands for, the eyebrow and the title. */
export function ScreenHead({
  image,
  title,
  accent = "cyan",
}: {
  image: string;
  title: string;
  accent?: Accent;
}) {
  return (
    <header className="m-head" data-accent={accent}>
      <img className="m-head-img" src={image} alt="" width={760} height={540} decoding="async" />
      <div className="m-head-fade" aria-hidden="true" />
      <div className="m-head-text">
        <p className="m-eyebrow">Quantum V2.0</p>
        <h1 className="m-head-title">{title}</h1>
      </div>
    </header>
  );
}
