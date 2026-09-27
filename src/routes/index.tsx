import { createFileRoute } from "@tanstack/react-router";
import { Descent } from "@/components/Descent";
import { Preloader } from "@/components/scene/Preloader";
import { MobileStreet } from "@/components/mobile/MobileStreet";
import { CrossroadsFooter } from "@/components/site/PageShell";
import { descentFilm, crossroadsPlate, fest, school } from "@/data/quantum";
import { STAGE_QUERY, useLayout } from "@/lib/motion";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => {
    const base = seo({
      title: "Inter-school tech & culture fest",
      description: `${fest.fullName} at ${school.name}: six inter-school events — Quiz, Film Making, Ad Shoot, Online Gaming, Pitch and one sealed Surprise. Register for the events.`,
      path: "/",
    });
    return {
      ...base,
      links: [
        ...base.links,
        // The hero is the largest contentful paint on this route; the poster
        // is what the visitor actually sees first, so it leads the queue. Only
        // where the film plays: the phone app opens on the still instead.
        {
          rel: "preload",
          as: "image",
          href: descentFilm.poster,
          fetchPriority: "high",
          media: STAGE_QUERY,
        },
        { rel: "preload", as: "image", href: crossroadsPlate.webp, type: "image/webp" },
      ],
    };
  },
  component: Index,
});

function Index() {
  return (
    <>
      {/* Only the home route holds a curtain: it is the one that has to wait
          on a film before it can do anything. */}
      <Preloader />
      {useLayout() === "desk" ? (
        <>
          <div id="main">
            <Descent />
          </div>
          <CrossroadsFooter />
        </>
      ) : (
        <MobileStreet />
      )}
    </>
  );
}
