import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  Info,
  Mail,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BROCHURE_URL, isTodo } from "@/data/quantum";

type Route = "/events" | "/register" | "/team" | "/faq" | "/about" | "/contact";

type DockItem =
  | { label: string; icon: ReactNode; to: Route }
  | { label: string; icon: ReactNode; brochure: true };

const ITEMS: DockItem[] = [
  { label: "Events", icon: <CalendarDays />, to: "/events" },
  { label: "Register", icon: <ClipboardCheck />, to: "/register" },
  { label: "Team", icon: <UsersRound />, to: "/team" },
  { label: "FAQ", icon: <CircleHelp />, to: "/faq" },
  { label: "About", icon: <Info />, to: "/about" },
  { label: "Brochure", icon: <BookOpen />, brochure: true },
  { label: "Contact", icon: <Mail />, to: "/contact" },
];

export function FloatingDock() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <nav className="crossroads-footer-nav floating-dock" aria-label="Quick navigation">
      <ul className="floating-dock-items" onMouseLeave={() => setActiveIndex(null)}>
        {ITEMS.map((item, index) => {
          const distance = activeIndex === null ? Infinity : Math.abs(activeIndex - index);
          const scale = reduceMotion ? 1 : distance === 0 ? 1.32 : distance === 1 ? 1.12 : 1;

          return (
            <motion.li
              key={item.label}
              className="floating-dock-item"
              animate={{ scale }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              onMouseEnter={() => setActiveIndex(index)}
              onFocusCapture={() => setActiveIndex(index)}
              onBlurCapture={() => setActiveIndex(null)}
            >
              {"to" in item ? (
                <Link to={item.to} className="floating-dock-link">
                  <span className="floating-dock-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sr-only">{item.label}</span>
                </Link>
              ) : isTodo(BROCHURE_URL) ? (
                <span
                  className="floating-dock-link floating-dock-pending"
                  aria-disabled="true"
                  title="Brochure coming soon"
                >
                  <span className="floating-dock-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sr-only">{item.label}, coming soon</span>
                </span>
              ) : (
                <a
                  href={BROCHURE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="floating-dock-link"
                >
                  <span className="floating-dock-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sr-only">{item.label}</span>
                </a>
              )}
              <span className="floating-dock-tooltip" aria-hidden="true">
                {item.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
