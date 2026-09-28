import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { MobileRegister } from "@/components/mobile/MobileRegister";
import { RegisterFormBody, type RegisterDraft } from "@/components/register/RegisterFormBody";
import { validateRegisterSearch } from "@/components/register/search";
import { useLayout } from "@/lib/motion";
import { seo } from "@/lib/seo";

/**
 * Register is the form. Nothing stands in front of it.
 *
 * There used to be a room here: a photographed desk whose one blank monitor
 * was the way in, a whole screen and a click spent on a door. Phones already
 * skipped it. Every way in now lands on the form itself, and the form's old
 * address forwards here.
 *
 * Before the room there was a chooser in front of a pair of near-identical
 * forms, one for an individual or team and one for a school. Everything about
 * an entry is the same either way, so that fork only ever asked a question
 * whose answer changed nothing.
 */
export const Route = createFileRoute("/register/")({
  validateSearch: validateRegisterSearch,
  head: () =>
    seo({
      title: "Register",
      description:
        "Register for Quantum V2.0. One form covers every event, for classes 9 to 12 at any participating school.",
      path: "/register",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { event } = Route.useSearch();
  // Outlives the desktop form, which a swap to the phone layout unmounts.
  const draft = useRef<RegisterDraft | null>(null);
  return useLayout() === "desk" ? (
    <RegisterFormBody preselectedEvent={event} draft={draft} />
  ) : (
    <MobileRegister preselectedEvent={event} />
  );
}
