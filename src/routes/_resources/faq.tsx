import { createFileRoute } from "@tanstack/react-router";
import { faqPage } from "@/data/quantum";
import { seo } from "@/lib/seo";

/** The FAQ tab of Resources. The screen is in ../_resources.tsx. */
export const Route = createFileRoute("/_resources/faq")({
  head: () =>
    seo({
      title: "FAQ",
      description: faqPage.tagline,
      path: "/faq",
    }),
});
