import { createFileRoute } from "@tanstack/react-router";
import { school } from "@/data/quantum";
import { seo } from "@/lib/seo";

/** The Contact tab of Resources. The screen is in ../_resources.tsx. */
export const Route = createFileRoute("/_resources/contact")({
  head: () =>
    seo({
      title: "Contact",
      description: `Who to call about each Quantum V2.0 event, and where to follow the fest, at ${school.name}, ${school.city}.`,
      path: "/contact",
    }),
});
