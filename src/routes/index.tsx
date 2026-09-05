import { createFileRoute } from "@tanstack/react-router";
import { ScrollDescent } from "@/components/ScrollDescent";
import { ContactFooter, EventsSection, FaqSection, TeamSection } from "@/components/Sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quantum V2.0 — Inter-School Tech & Culture Fest" },
      {
        name: "description",
        content:
          "Quantum V2.0 at A.F.S. Bal Bharati School: six inter-school events — Quiz, Film Making, Ad Shoot, Online Gaming, Pitch and one sealed Surprise.",
      },
      { property: "og:title", content: "Quantum V2.0 — Inter-School Tech & Culture Fest" },
      {
        property: "og:description",
        content:
          "Six events, one championship. Descend into Quantum V2.0 at A.F.S. Bal Bharati School.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <ScrollDescent />
      <EventsSection />
      <TeamSection />
      <FaqSection />
      <ContactFooter />
    </main>
  );
}
