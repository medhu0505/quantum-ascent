import { createFileRoute } from "@tanstack/react-router";
import { Descent } from "@/components/Descent";
import { Preloader } from "@/components/scene/Preloader";
import { SiteFooter } from "@/components/site/PageShell";
import { descentFilm, crossroadsPlate, fest, school } from "@/data/quantum";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => {
    const base = seo({
      title: "Inter-school tech & culture fest",
      description: `${fest.fullName} at ${school.name}: six inter-school events — Quiz, Film Making, Ad Shoot, Online Gaming, Pitch and one sealed Surprise. Register your school.`,
      path: "/",
    });
    return {
      ...base,
      links: [
        ...base.links,
        // The hero is the largest contentful paint on this route; the poster
        // is what the visitor actually sees first, so it leads the queue.
        { rel: "preload", as: "image", href: descentFilm.poster, fetchPriority: "high" },
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
      <div id="main">
        <Descent />
      </div>
      <SiteFooter />
    </>
  );
}
