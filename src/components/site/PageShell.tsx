import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BROCHURE_URL, contact, fest, isTodo, school } from "@/data/quantum";
import { ExitToCrossroads, RegisterChip, Value } from "@/components/site/Bits";
import { Beam, Reveal } from "@/components/scene/Reveal";
import { RevealText } from "@/components/scene/RevealText";

/**
 * Layout for the conventional pages.
 *
 * Deliberately the opposite register to the scenes in body copy — no plate,
 * no neon field, one column at a readable measure — but the same chrome as
 * every other room: the exit chip, the register chip, the interior pill.
 * These are pages you can arrive at directly (search, a bookmark, the 404
 * list), so the way back to the crossroads has to be right there rather
 * than implied by a logo.
 */
export function PageShell({
  title,
  lede,
  ledeBelow = false,
  children,
  registerChip = true,
}: {
  title: string;
  lede?: string | undefined;
  /**
   * Put the lede under the content instead of above it.
   *
   * The header used to cost about half the first screen everywhere —
   * measured: the thing a visitor came for started at 36% to 51% of the
   * fold, and on Meet the Team it started at 105%, entirely off it. An
   * eyebrow, a display-size title and a four-line paragraph is a lot to read
   * before you are allowed to see the six events.
   *
   * Where the lede is scene-setting rather than instruction, it reads just
   * as well after the thing it describes, and the thing itself gets the top
   * of the screen. Where it is instruction — the register form — it stays
   * where it is, because telling someone how to fill a form in after they
   * have filled it in is worse than a tall header.
   */
  ledeBelow?: boolean;
  children: ReactNode;
  /** Off on the register form itself — the chip would point at the page
   *  already open. */
  registerChip?: boolean;
}) {
  return (
    <>
      <ExitToCrossroads />
      {registerChip ? <RegisterChip /> : null}
      <CrossroadsFooter variant="interior" />

      <Beam />

      <main id="main" className="page">
        <div className="page-inner">
          <Reveal as="header" className="page-header">
            <p className="eyebrow">{fest.fullName}</p>
            <RevealText as="h1" className="page-title" text={title} />
            {lede && !ledeBelow ? (
              <RevealText as="p" className="page-lede" text={lede} delay={0.12} />
            ) : null}
          </Reveal>
          {children}
          {lede && ledeBelow ? <p className="page-lede page-lede-below">{lede}</p> : null}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-inner">
        <div className="footer-grid">
          <div>
            <p className="footer-mark">
              {fest.name} <span className="text-gradient-neon">{fest.edition}</span>
            </p>
            <p className="footer-school">{school.name}</p>
            <p className="footer-school">{school.city}</p>
          </div>

          <nav aria-label="Footer">
            <ul className="footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/events">Events</Link>
              </li>
              <li>
                <Link to="/register">Register</Link>
              </li>
              <li>
                <Link to="/team">Meet the Team</Link>
              </li>
              <li>
                <Link to="/faq">FAQ</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="footer-heading">Contact</p>
            <p className="footer-line">
              {contact.name} · {contact.role}
            </p>
            <p className="footer-line">
              {isTodo(contact.email) ? (
                <Value value={contact.email} label="Email" />
              ) : (
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              )}
            </p>
            <p className="footer-line">
              {isTodo(contact.phone) ? (
                <Value value={contact.phone} label="Phone" />
              ) : (
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>
              )}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * The crossroads' own footer: a pill, not a page section.
 *
 * The full grid above belongs to the pages someone reads — it is where the
 * fest mark, the school and a way to reach the organisers actually live. The
 * crossroads is a scene, not a document, and scrolling past the hub to a
 * page-shaped block of links underneath it would end the one immersive page
 * on the site exactly like every plain one. This floats instead: fixed low
 * on the screen the whole time the scene is, so it never has to be scrolled
 * to and never competes with the street behind it. Fest branding and contact
 * details stay off it — both are one click away on every other page, and a
 * pill this size is not the place for either.
 *
 * Same glass recipe as the exit and register chips already fixed to the top
 * of every interior (dark, blurred, a hairline inset border) so the two ends
 * of the screen read as one system rather than two different ideas of what
 * "floating UI" looks like on this site.
 */
/**
 * The floating pill.
 *
 * On the crossroads it parks on the road, gated behind [data-hub="arrived"]
 * so it waits for the descent to actually land there. Everywhere else there
 * is no road and no arrival to wait for — a room's own content runs to an
 * unpredictable length (a carousel, a fan of cards, a photo), so a pill
 * pinned to the bottom of the viewport would drift over whatever that room
 * happens to be showing. `variant="interior"` instead sits it at the top,
 * in the same fixed chrome band as the exit and register chips, which is
 * clear of body content on every room by construction rather than by
 * checking each room's layout by hand.
 */
export function CrossroadsFooter({
  variant = "crossroads",
}: {
  variant?: "crossroads" | "interior";
}) {
  return (
    <footer className="crossroads-footer" data-variant={variant}>
      <nav aria-label="Quick navigation" className="crossroads-footer-nav" data-variant={variant}>
        <ul>
          <li>
            <Link to="/events">Events</Link>
          </li>
          <li>
            <Link to="/register">Register</Link>
          </li>
          <li>
            <Link to="/team">Team</Link>
          </li>
          <li>
            <Link to="/faq">FAQ</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            {/* The PDF, not a page: a plain anchor into a new tab. Until
                BROCHURE_URL is a real address it is a label and not a link,
                the same as the brochure board on the crossroads — a pill
                entry that 404s is worse than one that says it is coming. */}
            {isTodo(BROCHURE_URL) ? (
              <span className="nav-pending" aria-disabled="true" title="Brochure coming soon">
                Brochure
              </span>
            ) : (
              <a href={BROCHURE_URL} target="_blank" rel="noreferrer">
                Brochure
              </a>
            )}
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
