import { Link } from "@tanstack/react-router";
import { AboutPanel, ContactPanel, FaqPanel } from "@/components/interiors/ResourcesPanels";
import { Beam, Reveal } from "@/components/scene/Reveal";
import { RevealText } from "@/components/scene/RevealText";
import { ExitToCrossroads, RegisterChip } from "@/components/site/Bits";
import { CrossroadsFooter, SiteFooter } from "@/components/site/PageShell";
import {
  about,
  contactPage,
  faqPage,
  fest,
  getScene,
  resourceTabs,
  type ResourceTab,
} from "@/data/quantum";

/**
 * Resources: the desk.
 *
 * /resources is the room and nothing else: a photographed desk whose three
 * monitors are FAQ, About and Contact. There is no headline plate, no scrim
 * and no card grid over the picture; clicking a screen is how you get in.
 *
 * Choosing a screen does not leave the room. The photograph folds up into a
 * band, the neon sign over the three monitors, the tab opens underneath it,
 * and the monitors stay on as the way between the three. /faq, /about and
 * /contact open on the folded room with their tab showing, and the phone app
 * answers the same addresses with the same three tabs, so a link to any of
 * them works on either layout.
 *
 * The screens are placed as percentages of the room, and the room is locked
 * to the photograph's own 16:9, so a hotspot sits on its monitor at every
 * width without measuring anything at runtime. The fold moves the room,
 * picture and hotspots together, inside a window that closes around it, so
 * the two cannot come apart either.
 */

/** Screen rectangles, in percent of the room. Read off the photograph:
 *  the whole pane of glass, bezel to bezel, so the button is the monitor. */
const SCREENS: Record<ResourceTab, { left: number; top: number; width: number; height: number }> = {
  faq: { left: 20.5, top: 34.6, width: 19.1, height: 15.8 },
  about: { left: 39.9, top: 34.7, width: 19.1, height: 15.4 },
  contact: { left: 59.4, top: 35.0, width: 19.1, height: 15.0 },
};

/**
 * Each tab's heading. Contact's lede follows its content, as it did as a page
 * of its own: it is scene-setting, and the numbers are what the visitor came
 * for, so they get the top of the screen.
 */
const HEADS: Record<ResourceTab, { title: string; lede: string; ledeBelow: boolean }> = {
  faq: { title: faqPage.title, lede: faqPage.tagline, ledeBelow: false },
  about: { title: about.title, lede: about.tagline, ledeBelow: false },
  contact: { title: contactPage.title, lede: contactPage.lede, ledeBelow: true },
};

export function ResourcesInterior({ tab }: { tab: ResourceTab | null }) {
  const scene = getScene("resources")!;
  const head = tab ? HEADS[tab] : null;

  return (
    <>
      <nav className="chip-bar" aria-label="Shortcuts">
        <ExitToCrossroads />
        <RegisterChip />
      </nav>
      <CrossroadsFooter variant="interior" />
      {tab ? <Beam /> : null}

      <main id="main" className="desk" data-tab={tab ?? undefined}>
        {/* The wall behind the desk already says Resources in neon, so this is
            only for anyone who cannot see it. Once a tab is open, the tab's
            own heading is the page's. */}
        {tab ? null : (
          <header className="desk-head">
            <p className="eyebrow">{fest.fullName}</p>
            <h1 className="page-title">{scene.label}</h1>
            <p className="page-lede">
              Everything about Quantum that is not an event: what it is, the questions we get asked,
              and how to reach the people running it.
            </p>
          </header>
        )}

        <div className="desk-frame">
          <div className="desk-window">
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

              <nav className="desk-nav" aria-label="Resources">
                <ul className="desk-screens">
                  {resourceTabs.map((t) => {
                    const at = SCREENS[t.id];
                    return (
                      <li
                        key={t.id}
                        style={{
                          left: `${at.left}%`,
                          top: `${at.top}%`,
                          width: `${at.width}%`,
                          height: `${at.height}%`,
                        }}
                      >
                        {/* Into the room adds to the history, so Back
                            unfolds it again; between tabs replaces, as the
                            phone's tab bar does. */}
                        <Link
                          to={t.to}
                          replace={tab !== null}
                          className="desk-screen"
                          aria-current={t.id === tab ? "page" : undefined}
                          data-cursor-label={t.id === tab ? undefined : "Open"}
                        >
                          <span className="desk-screen-label">{t.label}</span>
                          <span className="desk-screen-blurb">{t.blurb}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>

        {/* Keyed by tab, so each one arrives the way a page does rather than
            swapping its text in place. */}
        {tab && head ? (
          <div key={tab} className="desk-panel">
            <Reveal as="header" className="page-header">
              <p className="eyebrow">{fest.fullName}</p>
              <RevealText as="h1" className="page-title" text={head.title} />
              {head.ledeBelow ? null : (
                <RevealText as="p" className="page-lede" text={head.lede} delay={0.12} />
              )}
            </Reveal>
            <div className="desk-panel-body">
              {tab === "faq" ? <FaqPanel /> : tab === "about" ? <AboutPanel /> : <ContactPanel />}
              {head.ledeBelow ? <p className="page-lede page-lede-below">{head.lede}</p> : null}
            </div>
          </div>
        ) : null}
      </main>

      {tab ? (
        <SiteFooter />
      ) : (
        // Phones only; see .interior-footer in styles.css.
        <div className="interior-footer">
          <SiteFooter />
        </div>
      )}
    </>
  );
}
