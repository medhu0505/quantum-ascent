import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Pure layout. The chooser itself lives at the index route below — a file
 * next to a same-named directory becomes that directory's layout in
 * TanStack Router's file-based convention, so this has to be nothing but an
 * outlet or the individual and school routes never render: the layout's own
 * component is what a child route mounts into, and a layout with no outlet
 * has nowhere to put it.
 */
export const Route = createFileRoute("/register/form")({
  component: Outlet,
});
