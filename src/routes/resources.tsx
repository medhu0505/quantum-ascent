import { createFileRoute } from "@tanstack/react-router";
import { ResourcesInterior } from "@/components/interiors/ResourcesInterior";
import { MobileResources } from "@/components/mobile/MobileResources";
import { useLayout } from "@/lib/motion";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/resources")({
  head: () =>
    seo({
      title: "Resources",
      description: "The FAQ, the background on Quantum V2.0, and how to reach the organising team.",
      path: "/resources",
    }),
  component: ResourcesRoute,
});

function ResourcesRoute() {
  return useLayout() === "desk" ? <ResourcesInterior /> : <MobileResources tab="faq" />;
}
