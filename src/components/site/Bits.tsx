import { Link } from "@tanstack/react-router";
import { usePhaseLink } from "@/components/scene/PhaseTransition";
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
export function ExitToCrossroads() {
  const onPhase = usePhaseLink("/");
  return (
    <Link to="/" className="exit" onClick={onPhase}>
      <span aria-hidden="true">←</span>
      Back to the crossroads
    </Link>
  );
}
