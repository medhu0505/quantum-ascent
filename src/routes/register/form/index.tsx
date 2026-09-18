import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { events } from "@/data/quantum";
import { seo } from "@/lib/seo";

/**
 * The fork between the two actual forms.
 *
 * `?event=` arrives here from the Events rail and the register chip alike,
 * and has to survive the choice — someone who picked "Register for Quiz"
 * should not have to pick it again after saying which kind of entry this is.
 */
type Search = { event?: string | undefined };

export const Route = createFileRoute("/register/form/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    event:
      typeof search["event"] === "string" && events.some((e) => e.id === search["event"])
        ? (search["event"] as string)
        : undefined,
  }),
  head: () =>
    seo({
      title: "Register",
      description:
        "Register for Quantum V2.0, as an individual or team, or as a school's coordinator.",
      path: "/register/form",
    }),
  component: RegisterChooser,
});

function RegisterChooser() {
  const { event } = Route.useSearch();
  const search = event ? { event } : {};

  return (
    <PageShell
      title="Register"
      lede="Two ways in, same six events. Pick whichever one is actually you."
      registerChip={false}
    >
      <div className="register-choice">
        <Link to="/register/form/individual" search={search} className="register-choice-card">
          <span className="register-choice-title">Individual or team</span>
          <span className="register-choice-note">
            A student entering directly, alone or with a small team, for one event.
          </span>
        </Link>
        <Link to="/register/form/school" search={search} className="register-choice-card">
          <span className="register-choice-title">School</span>
          <span className="register-choice-note">
            A teacher or coordinator submitting an entry on the school&rsquo;s behalf.
          </span>
        </Link>
      </div>
    </PageShell>
  );
}
