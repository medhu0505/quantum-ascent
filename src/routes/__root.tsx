import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PhaseProvider } from "@/components/scene/PhaseTransition";
import { Cursor } from "@/components/scene/Cursor";
import { RouteAnnouncer, SkipLink } from "@/components/site/Bits";
import { SiteFooter } from "@/components/site/PageShell";
import { crossroadsPlate, scenes } from "@/data/quantum";
import { STAGE_QUERY, useLayout } from "@/lib/motion";
import { festJsonLd } from "@/lib/structured-data";
import { fest, school } from "@/data/quantum";

function NotFoundComponent() {
  return (
    <>
      {/* Hoisted into <head> by React. The route's own head() never runs for a
          not-found, so without this a missing page carries the site's own
          title and reads like a page that exists. */}
      <title>{`Page not found — ${fest.fullName}`}</title>
      <meta name="robots" content="noindex" />

      <div className="lost">
        <picture>
          <source srcSet={crossroadsPlate.webp} type="image/webp" />
          <img className="lost-plate" src={crossroadsPlate.jpg} alt="" aria-hidden="true" />
        </picture>
        <div className="lost-scrim" />

        <main id="main" className="lost-body">
          <p className="eyebrow">Error 404</p>
          <h1 className="lost-title">You took a wrong turn</h1>
          <p className="lost-lede">
            There is no street here. Every part of {fest.fullName} is one of these.
          </p>

          <ul className="lost-links">
            {scenes.map((scene) => (
              <li key={scene.id} data-accent={scene.accent}>
                <Link to={scene.to} className="lost-link">
                  <span className="lost-link-label">{scene.label}</span>
                  <span className="lost-link-blurb">{scene.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>

          <Link to="/" className="btn btn-ghost" data-magnetic>
            Back to Home
          </Link>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

// The router types a thrown value as `unknown`, since anything can be thrown;
// it is only logged and reported here, and both take it as it comes.
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${fest.fullName} — ${fest.kind}` },
      {
        name: "description",
        content: `${fest.kind} at ${school.name}, ${school.city}.`,
      },
      { name: "theme-color", content: "#12131f" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Type is self-hosted; these two are what the first heading and the first
      // paragraph need, so they lead rather than waiting on the stylesheet.
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/ChakraPetch-700.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/Manrope-var.woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Entrance animations start hidden and are revealed by an observer.
            Without JS that would leave the page blank, so the hidden state is
            gated on this flag, set before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            // The layout is decided here too, before first paint. The server
            // sends the phone app; on a desktop screen the stylesheet keeps it
            // hidden until the desktop site has taken over, so a desktop never
            // sees the phone app flash up first.
            __html: `document.documentElement.dataset.js="on";document.documentElement.dataset.layout=matchMedia(${JSON.stringify(STAGE_QUERY)}).matches?"desk":"phone"`,
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  /*
   * Analytics, off unless VITE_FIREBASE_ANALYTICS is exactly "true". Off by
   * default because gtag is a third-party request on every route, and this
   * site's standing property — asserted by a test — is that there are none.
   *
   * The flag is read here rather than only inside startAnalytics, and the
   * import is dynamic. This is the root component, so its effect runs on
   * every route: importing first and checking the flag afterwards fetched
   * src/lib/firebase.ts on every page view to have it decide, almost always,
   * to do nothing. Checking first means a deployment with analytics off never
   * requests the module at all.
   */
  useEffect(() => {
    if (import.meta.env["VITE_FIREBASE_ANALYTICS"] !== "true") return;
    void import("@/lib/firebase").then((m) => m.startAnalytics());
  }, []);

  // Kept in step with the layout on screen, before paint, so the stylesheet's
  // guard against the phone app on a desktop follows a resize or a rotation.
  const layout = useLayout();
  const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIsomorphicLayoutEffect(() => {
    document.documentElement.dataset["layout"] = layout;
  }, [layout]);

  return (
    <QueryClientProvider client={queryClient}>
      <PhaseProvider>
        <SkipLink />
        <RouteAnnouncer />
        <Cursor />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(festJsonLd()) }}
        />
      </PhaseProvider>
    </QueryClientProvider>
  );
}
