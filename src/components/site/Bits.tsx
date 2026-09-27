import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
import { usePreloadWhenIdle } from "@/lib/preload";
import { isTodo } from "@/data/quantum";

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
const HOME = ["/"] as const;

export function ExitToCrossroads() {
  const onPhase = usePhaseLink("/");
  usePreloadWhenIdle(HOME);
  return (
    <Link to="/" className="chip chip-left" onClick={onPhase} data-magnetic>
      <span aria-hidden="true">←</span>
      Back to Home
    </Link>
  );
}

/**
 * Registration is the site's whole job, so it stays one click away from every
 * interior rather than only from its own scene. Register itself never renders
 * this — it is the room the chip would point at — so there is no visibility
 * toggle to thread through: any scene that mounts it wants it shown.
 */
export function RegisterChip() {
  return (
    <Link to="/register" className="chip chip-right chip-accent" data-magnetic>
      Register
      <span aria-hidden="true">→</span>
    </Link>
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
  const [message, setMessage] = useState("");
  /*
   * Keyed to the page actually on screen, not to the router's "resolved"
   * event. That event also fires whenever a preload finishes, and every link
   * preloads its page when it is hovered or focused: each Tab onto a link
   * re-announced the page and threw focus back to the top of it, so a
   * keyboard could never get past the first link.
   */
  const pathname = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  const previous = useRef(pathname);

  useEffect(() => {
    const before = previous.current;
    previous.current = pathname;
    // The page the visitor lands on is not a navigation.
    if (!before || !pathname || before === pathname) return;
    // The title is set by each route's head(); read it after it lands.
    const frame = window.requestAnimationFrame(() => {
      setMessage(document.title);
      const main = document.getElementById("main");
      if (main) {
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
