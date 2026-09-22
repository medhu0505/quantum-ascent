import { Link } from "@tanstack/react-router";
import { ExitToCrossroads, RegisterChip } from "@/components/site/Bits";
import { CrossroadsFooter } from "@/components/site/PageShell";
import { faqs, fest, getScene } from "@/data/quantum";

/**
 * Resources: the desk.
 *
 * The room is the page. There is no headline plate, no scrim and no card
 * grid over the top of it — the three monitors on the desk are the three
 * destinations, and clicking a screen is how you get there. Anything laid
 * over the photograph would have been a second interface competing with the
 * one already in the picture.
 *
 * The screens are placed as percentages of the room, and the room is locked
 * to the photograph's own 16:9, so a hotspot sits on its monitor at every
 * width without measuring anything at runtime. Get that wrong — let the
 * image crop inside a box of a different shape — and the hit areas slide off
 * the hardware they belong to.
 */

/** Screen rectangles, in percent of the room. Read off the photograph —
 *  the whole pane of glass, bezel to bezel, so the button is the monitor. */
const SCREENS = [
  {
    to: "/faq",
    label: "FAQ",
    blurb: `${faqs.length} answers on entry, fees, scheduling and what to bring.`,
    left: 20.5,
    top: 34.6,
    width: 19.1,
    height: 15.8,
  },
  {
    to: "/about",
    label: "About",
    blurb: "What Quantum is, how it is scored, and who runs it.",
    left: 39.9,
    top: 34.7,
    width: 19.1,
    height: 15.4,
  },
  {
    to: "/contact",
    label: "Contact",
    blurb: "Reach the organising team before or during the fest.",
    left: 59.4,
    top: 35.0,
    width: 19.1,
    height: 15.0,
  },
] as const;

export function ResourcesInterior() {
  const scene = getScene("resources")!;

  return (
    <>
      <ExitToCrossroads />
      <RegisterChip />
      <CrossroadsFooter variant="interior" />

      <main id="main" className="desk">
        {/* The wall behind the desk already says Resources in neon, so on a
            wide viewport this is only for anyone who cannot see it. On a
            phone there is no wall — the photograph is gone and the room with
            it — so the same markup becomes the page's actual header rather
            than three cards floating with nothing to say what they are. */}
        <header className="desk-head">
          <p className="eyebrow">{fest.fullName}</p>
          <h1 className="page-title">{scene.label}</h1>
          <p className="page-lede">
            Everything about Quantum that is not an event: what it is, the questions we get
            asked, and how to reach the people running it.
          </p>
        </header>

        {/* The list is a sibling of the room, not a child of it. The room has
            to clip its own corners, and a clipping box cannot also let the
            narrow-screen fallback flow out underneath it. */}
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
            {SCREENS.map((s) => (
              <li
                key={s.to}
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: `${s.width}%`,
                  height: `${s.height}%`,
                }}
              >
                <Link to={s.to} className="desk-screen" data-cursor-label="Open">
                  <span className="desk-screen-label">{s.label}</span>
                  <span className="desk-screen-blurb">{s.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
