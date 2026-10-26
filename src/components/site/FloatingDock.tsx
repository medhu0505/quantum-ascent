import { Link } from "@tanstack/react-router";
import { BROCHURE_URL, isTodo } from "@/data/quantum";

type Route = "/events" | "/register" | "/team" | "/faq" | "/about" | "/contact";

type DockItem = { label: string; to: Route } | { label: string; brochure: true };

const ITEMS: DockItem[] = [
  { label: "Events", to: "/events" },
  { label: "Register", to: "/register" },
  { label: "Team", to: "/team" },
  { label: "FAQ", to: "/faq" },
  { label: "About", to: "/about" },
  { label: "Brochure", brochure: true },
  { label: "Contact", to: "/contact" },
];

export function FloatingDock() {
  return (
    <nav className="crossroads-footer-nav" aria-label="Quick navigation">
      <ul>
        {ITEMS.map((item) => (
          <li key={item.label}>
            {"to" in item ? (
              <Link to={item.to}>{item.label}</Link>
            ) : isTodo(BROCHURE_URL) ? (
              <span className="nav-pending" aria-disabled="true">
                {item.label}
              </span>
            ) : (
              <a href={BROCHURE_URL} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
