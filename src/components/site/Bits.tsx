import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
import { fest, isTodo, school } from "@/data/quantum";

/**
 * Renders a value the organisers have not supplied yet as a visibly unfinished
 * badge. A missing phone number should look missing rather than look like a
 * phone number — silently rendering the placeholder string is how a fest site
 * ships with "TODO" in the footer on the day.
 */
export function Value({ value, label }: { value: string; label?: string }) {
  if (!isTodo(value)) return <>{value}</>;
  return (
    <span className="todo" title={value}>
      <span aria-hidden="true">⚠</span>
      {label ? `${label} to be confirmed` : "To be confirmed"}
    </span>
  );
}

export function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to content
    </a>
  );
}

/** Fixed return-to-hub control, present in every interior. */
export function ExitToCrossroads() {
  const onPhase = usePhaseLink("/");
  return (
    <Link to="/" className="chip chip-left" onClick={onPhase} data-magnetic>
      <span aria-hidden="true">←</span>
      Back to the crossroads
    </Link>
  );
}

/**
 * Registration is the site's whole job, so it stays one click away from every
 * interior rather than only from its own scene. Suppressed on the Register
 * scene itself, where it would point at the room you are standing in.
 */
export function RegisterChip({ hidden = false }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <Link to="/register/form" className="chip chip-right chip-accent" data-magnetic>
      Register
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/** Header for the conventional pages. Scenes use the chips instead. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="site-mark">
        {fest.name} <span className="text-gradient-neon">{fest.edition}</span>
        <span className="sr-only"> — {school.name}</span>
      </Link>

      <nav aria-label="Main" className="site-nav">
        <Link to="/events">Events</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>

      <Link to="/register/form" className="btn btn-accent btn-sm" data-magnetic>
        Register
      </Link>
    </header>
  );
}

/**
 * Announces route changes to screen readers.
 *
 * A client-side navigation swaps the document without the page-load event a
 * screen reader normally announces, so without this the visitor is silently
 * moved and left wherever focus happened to be. Announce the new title, then
 * put focus back at the top of the document so the next Tab starts there.
 */
export function RouteAnnouncer() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    return router.subscribe("onResolved", () => {
      if (first.current) {
        first.current = false;
        return;
      }
      // The title is set by each route's head(); read it after it lands.
      window.requestAnimationFrame(() => {
        setMessage(document.title);
        const main = document.getElementById("main");
        if (main) {
          main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
        }
      });
    });
  }, [router]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
