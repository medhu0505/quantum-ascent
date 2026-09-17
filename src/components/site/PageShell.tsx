import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { contact, fest, school } from "@/data/quantum";
import { SiteHeader, Value } from "@/components/site/Bits";
import { Beam, Reveal } from "@/components/scene/Reveal";
import { RevealText } from "@/components/scene/RevealText";

/**
 * Layout for the conventional pages.
 *
 * Deliberately the opposite register to the scenes: no plate, no neon field,
 * one column at a readable measure. Someone checking what to bring at 11pm
 * the night before the fest needs the answer, not atmosphere.
 */
export function PageShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />

      <Beam />

      <main id="main" className="page">
        <div className="page-inner">
          <Reveal as="header" className="page-header">
            <p className="eyebrow">{fest.fullName}</p>
            <RevealText as="h1" className="page-title" text={title} />
            {lede ? <RevealText as="p" className="page-lede" text={lede} delay={0.12} /> : null}
          </Reveal>
          {children}
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
                <Link to="/">Crossroads</Link>
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
              <Value value={contact.email} label="Email" />
            </p>
            <p className="footer-line">
              <Value value={contact.phone} label="Phone" />
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
export function CrossroadsFooter() {
  return (
    <footer className="crossroads-footer">
      <nav aria-label="Footer" className="crossroads-footer-nav">
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
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
