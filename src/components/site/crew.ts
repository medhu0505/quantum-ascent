import type { FanImage } from "@/components/ui/image-fan-carousel";
import { crew, listOf, type Accent, type CrewSection } from "@/data/quantum";

/**
 * The crew as the team pages show it, in all three places: a card on the
 * ring, a frame on the wall and a row on the phone, one for every person and
 * never one for a team.
 *
 * Pictures go in src/assets/team, one file per person, named for them in
 * lower case with hyphens: aadi.jpg, linisha-das.webp, anjali-rawlley.png. A
 * person with a file there has it on all three; one without shows initials
 * on the ring and a silhouette on the wall, so a missing picture needs
 * nothing changed in code.
 */
const pictures = import.meta.glob<string>("/src/assets/team/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** "Mrs. Anjali Rawlley" is anjali-rawlley, the way her file is named. */
export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(?:mrs?|ms|dr)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const pictureOf = new Map(
  Object.entries(pictures).map(([path, url]) => [
    (path.split("/").pop() ?? "").replace(/\.[^.]+$/, "").toLowerCase(),
    url,
  ]),
);

export type CrewMember = {
  name: string;
  /** What they do, under their name: "PR Team", "The Q Factor coordinator". */
  role: string;
  /** Teammates share one, so a group reads as a group down the phone's list. */
  accent: Accent;
  /** Stands in for the picture: initials. */
  mark: string;
  photo?: string;
};

export type CrewWall = { heading: string; people: CrewMember[] };

const ACCENTS: readonly Accent[] = ["cyan", "magenta", "violet"];

/**
 * Two letters for a person with no picture yet: the first name's and the
 * last's, without the honorific in front. Most of the crew is named by first
 * name alone, and for them a second letter would only be the next letter of
 * the same name, so they get the one.
 */
function mark(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !/^(?:mrs?|ms|dr)\.?$/i.test(word));
  const first = words[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

/**
 * A section's people, in the order the brochure lists them. Someone listed
 * under two groups of one section is one person with both roles, not two
 * cards: Rudransh Singh runs Take Two with Riddhiman and Ryoken with Nitya.
 */
function membersOf(section: CrewSection): CrewMember[] {
  const seen = new Map<string, { roles: string[]; group: number }>();
  section.groups.forEach((group, index) => {
    for (const name of group.names) {
      const person = seen.get(name);
      if (person) person.roles.push(group.role);
      else seen.set(name, { roles: [group.role], group: index });
    }
  });

  return [...seen].map(([name, { roles, group }]) => {
    const photo = pictureOf.get(slugOf(name));
    return {
      name,
      role: `${listOf(roles)}${section.member ? ` ${section.member}` : ""}`,
      accent: ACCENTS[group % ACCENTS.length] ?? "cyan",
      mark: mark(name),
      ...(photo ? { photo } : {}),
    };
  });
}

export const crewWall: CrewWall[] = crew.map((section) => ({
  heading: section.heading,
  people: membersOf(section),
}));

/** Every person as a card on the ring, in the order the wall lists them. */
export const crewCards: FanImage[] = crewWall.flatMap(({ people }) =>
  people.map((person) => ({
    ...(person.photo ? { src: person.photo } : {}),
    alt: `${person.name}, ${person.role}`,
    stand: person.mark,
  })),
);
