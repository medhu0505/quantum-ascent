import { createFileRoute } from "@tanstack/react-router";
import { EventsInterior } from "@/components/interiors/EventsInterior";
import { events, getScene } from "@/data/quantum";
import { seo } from "@/lib/seo";

/**
 * `?event=<id>` opens that event's screen on arrival, so a single event can be
 * linked to and shared. Six disclosures on one page is the right shape for
 * comparing them; without the parameter there is no way to point at just one.
 */
export const Route = createFileRoute("/events")({
  validateSearch: (search: Record<string, unknown>): { event?: string | undefined } => ({
    event:
      typeof search["event"] === "string" && events.some((e) => e.id === search["event"])
        ? (search["event"] as string)
        : undefined,
  }),
  head: () =>
    seo({
      title: "Events",
      description: `Six events at Quantum V2.0: ${events.map((e) => e.name).join(", ")}. ${getScene("events")!.room} Team sizes, formats and how each one is scored.`,
      path: "/events",
    }),
  component: EventsInterior,
});
