import { createFileRoute } from "@tanstack/react-router";
import { RegisterFormBody } from "@/components/register/RegisterFormBody";
import { events } from "@/data/quantum";
import { seo } from "@/lib/seo";

type Search = { event?: string | undefined };

export const Route = createFileRoute("/register/form/school")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    event:
      typeof search["event"] === "string" && events.some((e) => e.id === search["event"])
        ? (search["event"] as string)
        : undefined,
  }),
  head: () =>
    seo({
      title: "Register — school",
      description:
        "Register a school for Quantum V2.0 as its coordinator. One form, every event: team details, contact and event selection.",
      path: "/register/form/school",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { event } = Route.useSearch();
  return <RegisterFormBody type="school" preselectedEvent={event} />;
}
