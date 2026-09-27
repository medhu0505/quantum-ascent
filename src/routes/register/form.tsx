import { createFileRoute, redirect } from "@tanstack/react-router";
import { validateRegisterSearch } from "@/components/register/search";

/**
 * Where the form used to live. Links to it are already out there, shared and
 * printed, so it forwards to /register rather than going missing, and a
 * preselected event travels with it.
 */
export const Route = createFileRoute("/register/form")({
  validateSearch: validateRegisterSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/register", search, replace: true, statusCode: 301 });
  },
});
