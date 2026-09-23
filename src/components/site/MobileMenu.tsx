import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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

type Item = { to: string; label: string; note: string; accent?: string };

const ITEMS: Item[] = [
  { to: "/register/form", label: "Register", note: "One form, every event.", accent: "cyan" },
  { to: "/events", label: "Events", note: "The six, and how each one runs.", accent: "cyan" },
  { to: "/team", label: "Meet the Team", note: "The students running it.", accent: "cyan" },
  { to: "/faq", label: "FAQ", note: "The questions we get asked.", accent: "violet" },
  {
    to: "/about",
    label: "About",
    note: "What Quantum is, and how it is scored.",
    accent: "violet",
  },
  { to: "/contact", label: "Contact", note: "Reach the organising team.", accent: "magenta" },
  { to: "/", label: "Home", note: "Back out to the street.", accent: "magenta" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const button = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  /* A tap on a link navigates and the menu has done its job. Closing on the
     router's own event rather than on the click covers the back button too. */
  useEffect(() => router.subscribe("onResolved", () => setOpen(false)), [router]);

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
            <li key={item.to} data-accent={item.accent}>
              <Link to={item.to} onClick={() => setOpen(false)}>
                <span className="menu-label">{item.label}</span>
                <span className="menu-note">{item.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
