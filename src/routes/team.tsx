import { createFileRoute } from "@tanstack/react-router";
import { TeamInterior } from "@/components/interiors/TeamInterior";
import { MobileTeam } from "@/components/mobile/MobileTeam";
import { getScene } from "@/data/quantum";
import { useLayout } from "@/lib/motion";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/team")({
  head: () =>
    seo({
      title: "Meet the Team",
      description: `${getScene("team")!.room} Quantum V2.0 is student-run end to end — events, tech, design, media and logistics.`,
      path: "/team",
    }),
  component: TeamRoute,
});

function TeamRoute() {
  return useLayout() === "desk" ? <TeamInterior /> : <MobileTeam />;
}
