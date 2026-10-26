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
      description: `${getScene("team")!.room} Meet the student event coordinators and organising teams behind Quantum V2.0.`,
      path: "/team",
    }),
  component: TeamRoute,
});

function TeamRoute() {
  return useLayout() === "desk" ? <TeamInterior /> : <MobileTeam />;
}
