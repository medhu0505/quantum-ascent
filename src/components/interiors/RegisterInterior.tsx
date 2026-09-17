import { Link } from "@tanstack/react-router";
import { ExitToCrossroads } from "@/components/site/Bits";
import { CrossroadsFooter } from "@/components/site/PageShell";
import { events, getScene } from "@/data/quantum";

/**
 * Register: the desk. Same treatment as Resources — the room is the page.
 *
 * This was a terminal card floating over a small window photo, with copy
 * doing the work of saying "this is where you register." There is one
 * destination here, so there is one screen: the blank centre monitor is the
 * button, because a screen with nothing on it is exactly what a form waiting
 * to be opened should look like. The two side monitors are dressing in the
 * photograph, not part of the interface — nothing is hung on them.
 */
export function RegisterInterior() {
  const scene = getScene("register")!;

  return (
    <>
      <ExitToCrossroads />
      <CrossroadsFooter variant="interior" />

      <main id="main" className="desk">
        {/* The wall behind the desk carries no readable heading of its own —
            the photograph is the identity — so this is what a screen reader
            announces instead. */}
        <h1 className="sr-only">{scene.label}</h1>

        <div className="desk-frame">
          <div className="desk-room">
            <img
              className="desk-plate"
              src={scene.view}
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
    </>
  );
}
