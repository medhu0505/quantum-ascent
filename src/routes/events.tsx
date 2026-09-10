import { createFileRoute } from "@tanstack/react-router";
import { EventsInterior } from "@/components/interiors/EventsInterior";
import { events, getScene } from "@/data/quantum";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/events")({
  head: () =>
    seo({
      title: "Events",
      description: `Six events at Quantum V2.0: ${events.map((e) => e.name).join(", ")}. ${getScene("events")!.room} Team sizes, formats and how each one is scored.`,
      path: "/events",
    }),
  component: EventsInterior,
});
