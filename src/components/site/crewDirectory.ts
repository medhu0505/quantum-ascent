import { contact, crew, events, type Accent } from "@/data/quantum";

/**
 * The detailed crew directory under Meet the Team's ring: one team after
 * another, each with a card for every person in it.
 *
 * It reads the same `crew` the ring does and leaves it alone, so the ring
 * stays what it was. Here a group is taken apart into its people; someone who
 * is listed under two teams is on both, with the same picture.
 *
 * Pictures go in src/assets/team, one file per person, named for them in
 * lower case with hyphens: aadi.jpg, linisha-das.webp, anjali-rawlley.png. A
 * person with a file there has it on their card, and the card does not change
 * shape; one without shows the placeholder.
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

export type DirectoryPerson = {
  name: string;
  /** Only where the site already publishes one: the coordinators and the teacher in charge. */
  phone?: string;
  photo?: string;
};

export type DirectoryTeam = {
  id: string;
  heading: string;
  /** What the team's people are, where the data says: "Coordinators". */
  tag?: string;
  /** One person's part in it, said on their own profile: "Event coordinator". */
  role: string;
  accent: Accent;
  people: DirectoryPerson[];
};

const ACCENTS: readonly Accent[] = ["cyan", "magenta", "violet"];

/**
 * A section of one group is that group under the section's own name: Faculty,
 * with the teacher in charge. Otherwise each group is a team under its own
 * name, an event or an organising team. An event keeps the accent the rest of
 * the site gives it; the others take them in turn.
 *
 * A number is on a person's card only where the site already prints it: an
 * event's coordinators have theirs on the Events and Contact pages, and the
 * teacher in charge has hers on Contact and in the footers. Nobody else has
 * one in the data, and no email is here at all.
 */
export const crewDirectory: DirectoryTeam[] = crew.flatMap((section) => {
  const alone = section.groups.length === 1;
  return section.groups.map((group, index) => {
    const heading = alone ? section.heading : group.role;
    const tag = alone
      ? group.role
      : section.noun && `${section.noun.charAt(0).toUpperCase()}${section.noun.slice(1)}`;
    // "Event coordinators" and "Organising teams" are the sections' plurals.
    const role = alone ? group.role : section.heading.replace(/s$/, "");
    const event = events.find((e) => e.name === group.role);
    return {
      id: slugOf(heading),
      heading,
      ...(tag ? { tag } : {}),
      role,
      accent: event?.accent ?? ACCENTS[index % ACCENTS.length] ?? "cyan",
      people: group.names.map((name) => {
        const photo = pictureOf.get(slugOf(name));
        const phone =
          event?.coordinators.find((c) => c.name === name)?.phone ??
          (name === contact.name ? contact.phone : undefined);
        return { name, ...(phone ? { phone } : {}), ...(photo ? { photo } : {}) };
      }),
    };
  });
});
