import { createFileRoute } from "@tanstack/react-router";
import { about } from "@/data/quantum";
import { seo } from "@/lib/seo";

/** The About tab of Resources. The screen is in ../_resources.tsx. */
export const Route = createFileRoute("/_resources/about")({
  head: () =>
    seo({
      title: "About",
      // The first sentence of the tab's own opening paragraph.
      description: `${about.intro.body[0].split(". ")[0]}.`,
      path: "/about",
    }),
});
