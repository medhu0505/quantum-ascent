import { createFileRoute } from "@tanstack/react-router";
import { RegisterFormBody } from "@/components/register/RegisterFormBody";
import { events } from "@/data/quantum";
import { seo } from "@/lib/seo";

/**
 * One form, at one address.
 *
 * This was a chooser page in front of a pair of near-identical forms, one
 * for an individual or team and one for a school. Everything about an entry
 * is the same either way — a team lead, the events, the rest of the team —
 * so the fork only ever asked a question whose answer changed nothing.
 */
type Search = { event?: string | undefined };

export const Route = createFileRoute("/register/form")({
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
        "Register for Quantum V2.0: team lead's details, the events you are entering, and the rest of the team.",
      path: "/register/form",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { event } = Route.useSearch();
  return <RegisterFormBody preselectedEvent={event} />;
}
