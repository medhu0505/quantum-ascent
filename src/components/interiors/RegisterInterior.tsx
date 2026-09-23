import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect } from "react";
import { ExitToCrossroads } from "@/components/site/Bits";
import { CrossroadsFooter, SiteFooter } from "@/components/site/PageShell";
import { events, fest, getScene } from "@/data/quantum";

/**
 * Register: the desk. Same treatment as Resources — the room is the page.
 *
 * This was a terminal card floating over a small window photo, with copy
 * doing the work of saying "this is where you register." There is one
 * destination here, so there is one screen: the blank centre monitor is the
 * button, because a screen with nothing on it is exactly what a form waiting
 * to be opened should look like. The two side monitors are dressing in the
 * photograph, not part of the interface — nothing is hung on them.
 *
 * None of that survives a phone. The room is a wide photograph with a
 * monitor in the middle of it, and at that width the monitor is a thumbnail
 * carrying a single link — a whole screen and a tap spent on a door. So a
 * narrow viewport skips the room and goes to the form, replacing this entry
 * in history rather than stacking on it, or Back would land here and bounce
 * straight through again.
 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function RegisterInterior() {
  const scene = getScene("register")!;
  const navigate = useNavigate();

  useIsomorphicLayoutEffect(() => {
    if (!window.matchMedia("(max-width: 48rem)").matches) return;
    void navigate({ to: "/register/form", replace: true });
  }, [navigate]);

  return (
    <>
      <ExitToCrossroads />
      <CrossroadsFooter variant="interior" />

      <main id="main" className="desk">
        {/* The photograph is the identity on a wide viewport, so this is what
            a screen reader announces instead. On a phone the photograph is
            gone and this is the header people read. A phone normally never
            sees this room at all — the effect above sends it to the form —
            but that is a layout effect, and no script means no redirect. */}
        <header className="desk-head">
          <p className="eyebrow">{fest.fullName}</p>
          <h1 className="page-title">{scene.label}</h1>
          <p className="page-lede">
            One form covers every event. Classes 9 to 12, enter as many events as you can attend,
            and list your team on the same form.
          </p>
        </header>

        <div className="desk-frame">
          <div className="desk-room">
            <img
              className="desk-plate"
              src={scene.view!}
              alt=""
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <ul className="desk-screens">
            <li style={{ left: "33.36%", top: "26.3%", width: "24.93%", height: "19.66%" }}>
              <Link to="/register/form" className="desk-screen" data-cursor-label="Open">
                <span className="desk-screen-label">Register</span>
                <span className="sr-only">
                  . Open the entry form — {events.length} events open, classes 9 to 12, one form.
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </main>

      {/* Phones only; see .interior-footer in styles.css. */}
      <div className="interior-footer">
        <SiteFooter />
      </div>
    </>
  );
}
