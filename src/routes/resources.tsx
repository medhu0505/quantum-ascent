import { createFileRoute } from "@tanstack/react-router";
import { ResourcesInterior } from "@/components/interiors/ResourcesInterior";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/resources")({
  head: () =>
    seo({
      title: "Resources",
      description: "The FAQ, the background on Quantum V2.0, and how to reach the organising team.",
      path: "/resources",
    }),
  component: ResourcesInterior,
});
