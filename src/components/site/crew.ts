import type { FanImage } from "@/components/ui/image-fan-carousel";
import { crew, listOf, type CrewGroup, type CrewSection } from "@/data/quantum";

/**
 * The crew as the team pages show it, in both layouts: one card on the ring
 * and one line on the wall per group, never one per person.
 */

/**
 * Two letters for a card with no picture yet. One person gets their
 * initials; a group gets its name's, less the words every group shares, so
 * the ring reads AR, QF, PR, WD rather than a column of Ts.
 */
function mark(group: CrewGroup): string {
  const text = group.names.length === 1 ? (group.names[0] ?? group.role) : group.role;
  const words = text.split(/\s+/).filter((word) => word && !/^(the|team)$/i.test(word));
  const [first = "", second] = words;
  return (second ? `${first[0] ?? ""}${second[0] ?? ""}` : first.slice(0, 2)).toUpperCase();
}

/** "The Q Factor coordinators: Linisha Das and Aayush Singh". */
export function crewCaption(section: CrewSection, group: CrewGroup): string {
  return `${group.role}${section.noun ? ` ${section.noun}` : ""}: ${listOf(group.names)}`;
}

/** Every group as a card on the ring, in the order the wall lists them. */
export const crewCards: FanImage[] = crew.flatMap((section) =>
  section.groups.map((group) => ({
    ...(group.photo ? { src: group.photo } : {}),
    alt: crewCaption(section, group),
    stand: mark(group),
  })),
);
