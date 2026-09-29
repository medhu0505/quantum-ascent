import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

/** The room itself, before a tab is chosen. The screen is in ../_resources.tsx. */
export const Route = createFileRoute("/_resources/resources")({
  head: () =>
    seo({
      title: "Resources",
      description: "The FAQ, the background on Quantum V2.0, and how to reach the organising team.",
      path: "/resources",
    }),
});
