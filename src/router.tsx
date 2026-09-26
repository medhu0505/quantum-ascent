import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    /*
     * Fetch a route's code and data on hover or touch, before the click.
     *
     * Only the crossroads signs asked for this, one link at a time, so
     * every other way into a room — the menu, the chips, the footer, the
     * calls to action — started loading the route only once you had
     * committed to it. Measured from a click on the crossroads: Meet the
     * Team took 861ms before its card deck existed at all, because the
     * module was still being fetched. Set here it covers every Link in the
     * app rather than the handful someone remembered to annotate.
     */
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
  });

  return router;
};
