import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from "react";
import { Reveal } from "@/components/scene/Reveal";
import {
  crewDirectory,
  type DirectoryPerson,
  type DirectoryTeam,
} from "@/components/site/crewDirectory";
import { portraitTexture } from "@/components/site/portraitTexture";

/**
 * The detailed crew under Meet the Team's ring, on both layouts: a heading for
 * each team, then a portrait card for each person in it. One component, so a
 * phone gets the same cards on fewer columns rather than a different section.
 *
 * Every card has a slot of its own, the same shape whether it holds a picture
 * or the placeholder, so adding a picture later moves nothing.
 *
 * With a mouse a card tilts toward the pointer, catches the light where it is,
 * and its portrait ripples like water under the pointer.
 */

/*
 * One WebGL canvas follows the mouse from card to card, because a browser
 * keeps only a handful of WebGL contexts alive and the directory has
 * thirty-odd cards. It is three.js, so it loads on its own, once the page is
 * idle, and never for touch or reduced motion.
 */
const loadRipple = () => import("@/components/ui/image-ripple-effect");
const Ripple = lazy(() => loadRipple().then((m) => ({ default: m.ImageRippleEffect })));
const keyOf = (team: DirectoryTeam, person: DirectoryPerson) => `${team.id}:${person.name}`;

/** Points the tilt and the glare at the pointer; the stylesheet decides whether to use them. */
function aim(e: PointerEvent<HTMLElement>) {
  if (e.pointerType === "touch") return;
  const card = e.currentTarget;
  const box = card.getBoundingClientRect();
  const x = (e.clientX - box.left) / box.width;
  const y = (e.clientY - box.top) / box.height;
  card.style.setProperty("--mx", `${x * 100}%`);
  card.style.setProperty("--my", `${y * 100}%`);
  card.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
  card.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
}

function release(e: PointerEvent<HTMLElement>) {
  for (const name of ["--mx", "--my", "--rx", "--ry"]) e.currentTarget.style.removeProperty(name);
}

function Portrait({ person, ripple }: { person: DirectoryPerson; ripple?: string | undefined }) {
  return (
    <span className="dir-slot" data-photo={person.photo ? "" : undefined} aria-hidden="true">
      {person.photo ? (
        <img src={person.photo} alt="" width={480} height={600} loading="lazy" decoding="async" />
      ) : (
        <svg className="dir-silhouette" focusable="false">
          <use href="#dir-person" />
        </svg>
      )}
      {ripple ? (
        <Suspense fallback={null}>
          <Ripple
            className="dir-ripple absolute inset-0 h-full"
            images={[{ src: ripple, x: 0, y: 0, widthScale: 1, heightScale: 1.25 }]}
            distortionStrength={0.03}
            waveSize={30}
            waveCount={50}
            waveFadeMultiplier={0.93}
            waveGrowth={0.11}
          />
        </Suspense>
      ) : null}
    </span>
  );
}

export function TeamDirectory() {
  const [canRipple, setCanRipple] = useState(false);
  const [ripple, setRipple] = useState<{ key: string; src: string } | null>(null);
  const hovered = useRef<string | null>(null);
  const letGo = useRef(0);

  useEffect(() => {
    const ok =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCanRipple(ok);
    if (!ok) return;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500));
    idle(() => void loadRipple());
    return () => window.clearTimeout(letGo.current);
  }, []);

  const enter = (e: PointerEvent<HTMLElement>, team: DirectoryTeam, person: DirectoryPerson) => {
    if (!canRipple || e.pointerType !== "mouse") return;
    const key = keyOf(team, person);
    hovered.current = key;
    window.clearTimeout(letGo.current);
    const accent = getComputedStyle(e.currentTarget).getPropertyValue("--accent-hue").trim();
    portraitTexture(person.photo, accent || "oklch(0.84 0.13 215)")
      .then((src) => {
        if (hovered.current === key) setRipple({ key, src });
      })
      .catch(() => {});
  };

  // The waves get a moment to settle before the canvas goes.
  const leave = (team: DirectoryTeam, person: DirectoryPerson) => {
    const key = keyOf(team, person);
    if (hovered.current === key) hovered.current = null;
    window.clearTimeout(letGo.current);
    letGo.current = window.setTimeout(() => {
      setRipple((r) => (r?.key === key ? null : r));
    }, 700);
  };

  return (
    <div className="dir">
      {/* The placeholder's figure, drawn once and used by every card. */}
      <svg className="dir-defs" aria-hidden="true" focusable="false">
        <symbol id="dir-person" viewBox="0 0 100 125">
          <circle cx="50" cy="46" r="17" />
          <path d="M16 125c0-26 14-41 34-41s34 15 34 41z" />
        </symbol>
      </svg>

      <div className="dir-teams">
        {crewDirectory.map((team) => (
          <Reveal as="section" key={team.id} className="dir-team" data-accent={team.accent}>
            <h3 className="dir-heading">
              {team.heading}
              {team.tag ? <span className="dir-tag">{team.tag}</span> : null}
            </h3>
            <ul className="dir-grid" role="list">
              {team.people.map((person) => (
                <li key={person.name}>
                  <figure
                    className="dir-card"
                    onPointerEnter={(e) => enter(e, team, person)}
                    onPointerMove={aim}
                    onPointerLeave={(e) => {
                      release(e);
                      leave(team, person);
                    }}
                  >
                    <Portrait
                      person={person}
                      ripple={ripple?.key === keyOf(team, person) ? ripple.src : undefined}
                    />
                    <figcaption className="dir-name">{person.name}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
