import { fest, school } from "@/data/quantum";

/**
 * Builds the head meta for a route.
 *
 * This is a real site people have to find and share, not only look at, so
 * every route carries its own title, description and share card rather than
 * inheriting one generic set from the root.
 */
export function seo({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const fullTitle = `${title} — ${fest.fullName}`;
  const image = "/media/og-card.jpg";

  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: image },
      { property: "og:site_name", content: `${fest.fullName} · ${school.name}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: path }],
  };
}
