import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BROCHURE_URL, isTodo } from "@/data/quantum";

/**
 * The phone's navigation.
 *
 * A phone had three half-navigations and no whole one: a pill on the hero
 * carrying six links, a Register chip on every interior, and the footer's
 * column at the bottom of a scroll. None of them was reachable from
 * everywhere, and the pill's six labels only fit above 373px.
 *
 * This is one bar, on every page, with every destination on it — built the
 * way the crossroads signs are built, because on a phone that is now the
 * site's only visual language. The pill is hidden below the same breakpoint:
 * two navigations carrying the same six links is not twice the navigation.
 *
 * Desktop never sees any of it. There the pill sits on the road where it
 * belongs and there is room for it.
 */

/** `to` is a route; `href` is somewhere outside the router, like the PDF. */
type Item = { to?: string; href?: string; label: string; note: string; accent?: string };

const ITEMS: Item[] = [
  { to: "/register", label: "Register", note: "One form, every event.", accent: "cyan" },
  { to: "/events", label: "Events", note: "The six, and how each one runs.", accent: "cyan" },
  { to: "/team", label: "Meet the Team", note: "The students running it.", accent: "cyan" },
  { to: "/faq", label: "FAQ", note: "The questions we get asked.", accent: "violet" },
  {
    to: "/about",
    label: "About",
    note: "What Quantum is, and how it is scored.",
    accent: "violet",
  },
  { href: BROCHURE_URL, label: "Brochure", note: "The fest in one PDF.", accent: "violet" },
  { to: "/contact", label: "Contact", note: "Reach the organising team.", accent: "magenta" },
  { to: "/", label: "Home", note: "Back out to the street.", accent: "magenta" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  // The page on screen, which during a navigation is still the one being
  // left: the location itself changes the moment the link is tapped.
  const onScreen = useRouterState({ select: (state) => state.resolvedLocation?.href });
  const pathname = useRouterState({
    select: (state) => (state.resolvedLocation ?? state.location).pathname,
  });
  const button = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  /* The menu closes when the page on screen changes, not when the link is
     tapped. Closing on the tap took the menu away while the next page was
     still loading, so on a slow connection the visitor was left looking at
     the page they had just asked to leave, for over a second on 3G, and read
     it as the tap having done nothing. It also covers the back button.

     Not the router's "resolved" event: that fires whenever a preload
     finishes too, and touching an item preloads its page. With the page
     already cached, the preload finished between the finger landing and the
     click, the menu closed under the finger, and the click went through to
     whatever was underneath. */
  useEffect(() => setOpen(false), [onScreen]);

  /* A tap on the page already showing has no navigation to wait for, so it
     goes to the top of that page and closes. Left to the router it would
     change nothing, and the menu would stay open over a page that never
     moved. */
  const toTopOfThisPage = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (to !== pathname) return;
    e.preventDefault();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      // Send focus back where it came from, but only on an actual close —
      // not on the first render, which would steal focus from the page.
      if (wasOpen.current) button.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="menu">
      <button
        ref={button}
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="menu-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {/* Rendered whether or not it is open, so it can be animated. `inert`
          is what actually keeps it out of tab order and off a screen
          reader's radar while it is shut — `hidden` would cancel the
          transition, and opacity alone would leave seven links focusable
          behind a panel nobody can see. */}
      <div
        id="mobile-menu"
        className="menu-panel"
        data-open={open || undefined}
        inert={!open || undefined}
      >
        <ul>
          {ITEMS.map((item) => (
            <li key={item.to ?? item.href} data-accent={item.accent}>
              {item.href !== undefined ? (
                isTodo(item.href) ? (
                  <span className="menu-pending" aria-disabled="true">
                    <span className="menu-label">{item.label}</span>
                    <span className="menu-note">To be confirmed.</span>
                  </span>
                ) : (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                  >
                    <span className="menu-label">{item.label}</span>
                    <span className="menu-note">{item.note}</span>
                  </a>
                )
              ) : (
                <Link to={item.to!} onClick={(e) => toTopOfThisPage(e, item.to!)}>
                  <span className="menu-label">{item.label}</span>
                  <span className="menu-note">{item.note}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
