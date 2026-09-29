import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { ResourcesInterior } from "@/components/interiors/ResourcesInterior";
import { MobileResources } from "@/components/mobile/MobileResources";
import { resourceTabAt } from "@/data/quantum";
import { useLayout } from "@/lib/motion";

/**
 * Resources: /resources, /faq, /about and /contact are one screen with three
 * tabs, on both layouts.
 *
 * This layout has no path of its own. It owns the screen, so the screen stays
 * mounted while the address moves between the four: on a desktop the room
 * folds and unfolds rather than being built again, and on a phone the header
 * stays put while the tab under it changes. The child routes carry nothing
 * but each address's title and description.
 */
export const Route = createFileRoute("/_resources")({
  component: ResourcesLayout,
});

function ResourcesLayout() {
  const tab = resourceTabAt(useLocation({ select: (location) => location.pathname }));
  const layout = useLayout();

  return (
    <>
      {layout === "desk" ? (
        <ResourcesInterior tab={tab} />
      ) : (
        // A phone has no room to stand in, so /resources opens on the FAQ.
        <MobileResources tab={tab ?? "faq"} />
      )}
      <Outlet />
    </>
  );
}
