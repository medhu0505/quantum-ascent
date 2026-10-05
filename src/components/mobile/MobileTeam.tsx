import { MobileShell, ScreenHead } from "@/components/mobile/MobileShell";
import { crewCards } from "@/components/site/crew";
import { TeamDirectory } from "@/components/site/TeamDirectory";
import { Carousel360 } from "@/components/ui/image-fan-carousel";
import { getScene, teamClosing } from "@/data/quantum";

/**
 * Meet the Team on a phone. The deck is the desktop site's own: the ring of
 * cards you drag round, with the one at the front shown large. Under it, the
 * crew directory, the same cards as on the desktop on fewer columns.
 */

export function MobileTeam() {
  return (
    <MobileShell screen="team">
      <ScreenHead image={getScene("team")!.view!} title="Meet the Team" />

      <div className="m-deck">
        <Carousel360 images={crewCards} />
      </div>

      <div className="m-pad">
        <h2 className="m-h2 m-h2-lg">The full crew</h2>
        <TeamDirectory />
        <p className="m-muted m-small m-closing">{teamClosing}</p>
      </div>
    </MobileShell>
  );
}
