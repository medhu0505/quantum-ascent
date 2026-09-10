import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { contact, fest, school } from "@/data/quantum";
import { SiteHeader, Value } from "@/components/site/Bits";

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

      <main id="main" className="page">
        <div className="page-inner">
          <header className="page-header">
            <p className="eyebrow">{fest.fullName}</p>
            <h1 className="page-title">{title}</h1>
            {lede ? <p className="page-lede">{lede}</p> : null}
          </header>
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
