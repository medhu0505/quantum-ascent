import { events } from "@/data/quantum";

/** `?event=quiz` arrives with that event already ticked. */
export type RegisterSearch = { event?: string | undefined };

/** Keeps an event id the fest actually runs and drops anything else. */
export function validateRegisterSearch(search: Record<string, unknown>): RegisterSearch {
  const event = search["event"];
  return {
    event: typeof event === "string" && events.some((e) => e.id === event) ? event : undefined,
  };
}
