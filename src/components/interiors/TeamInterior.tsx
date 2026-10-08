import { InteriorShell } from "@/components/interiors/InteriorShell";
import { crewCards } from "@/components/site/crew";
import { TeamRipple } from "@/components/site/TeamRipple";
import { TeamDirectory } from "@/components/site/TeamDirectory";
import { getScene, teamClosing } from "@/data/quantum";
import { Carousel360 } from "@/components/ui/image-fan-carousel";

/**
 * Meet the Team: the ring of cards, and under it the crew directory.
 *
 * The brochure names the people running Quantum by what they run: the
 * teacher in charge, the student coordinators of each event, and the four
 * organising teams. The ring shows each of those as a card; the directory
 * names every person in them, a portrait card each, under their team.
 */
export function TeamInterior() {
  const scene = getScene("team")!;

  return (
    <InteriorShell scene={scene} leadBelow lead={teamClosing}>
      <Carousel360 images={crewCards} />

      <TeamRipple />

      <h2 className="page-subhead">The full crew</h2>

      <TeamDirectory />
    </InteriorShell>
  );
}
