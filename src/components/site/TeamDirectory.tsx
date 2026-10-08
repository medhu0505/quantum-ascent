import { X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from "react";
import { Reveal } from "@/components/scene/Reveal";
import {
  crewDirectory,
  type DirectoryPerson,
  type DirectoryTeam,
} from "@/components/site/crewDirectory";
import { listOf } from "@/data/quantum";
import { telHref } from "@/lib/utils";
import { portraitTexture } from "@/components/site/portraitTexture";

/**
 * The detailed crew under Meet the Team's ring, on both layouts: a heading for
 * each team, then a portrait card for each person in it. One component, so a
 * phone gets the same cards on fewer columns rather than a different section.
 *
 * Every card has a slot of its own, the same shape whether it holds a picture
 * or the placeholder, so adding a picture later moves nothing.
 *
 * The cards answer you. With a mouse one tilts toward the pointer and catches
 * the light where it is. Choosing one, by click, tap, Enter or Space, opens
 * that person's profile in a dialog: the larger portrait, their team and part
 * in it and, for the coordinators and the teacher in charge, whose numbers the
 * site already prints, a button to call.
 */

type Profile = { team: DirectoryTeam; person: DirectoryPerson };

/*
 * With a mouse, the portrait under the pointer ripples like water. One WebGL
 * canvas follows the mouse from card to card, because a browser keeps only a
 * handful of WebGL contexts alive and the directory has thirty-odd cards. It
 * is three.js, so it loads on its own, once the page is idle, and never for
 * touch or reduced motion.
 */
const loadRipple = () => import("@/components/ui/image-ripple-effect");
const Ripple = lazy(() => loadRipple().then((m) => ({ default: m.ImageRippleEffect })));
const keyOf = (team: DirectoryTeam, person: DirectoryPerson) => `${team.id}:${person.name}`;

/** Points the tilt and the glare at the pointer; the stylesheet decides whether to use them. */
function aim(e: PointerEvent<HTMLButtonElement>) {
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

function release(e: PointerEvent<HTMLButtonElement>) {
  for (const name of ["--mx", "--my", "--rx", "--ry"]) e.currentTarget.style.removeProperty(name);
}

/**
 * The profile's portrait in depth: --px and --py run from -1 to 1 across the
 * profile, and the stylesheet moves the picture, its frame and its ground by
 * different amounts against them. Touch steers it too, while a finger drags.
 */
function parallax(e: PointerEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const box = el.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * 2 - 1;
  const y = ((e.clientY - box.top) / box.height) * 2 - 1;
  el.style.setProperty("--px", Math.max(-1, Math.min(1, x)).toFixed(3));
  el.style.setProperty("--py", Math.max(-1, Math.min(1, y)).toFixed(3));
}

function settle(e: PointerEvent<HTMLDivElement>) {
  e.currentTarget.style.removeProperty("--px");
  e.currentTarget.style.removeProperty("--py");
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
            distortionStrength={0.05}
            waveSize={34}
            waveCount={50}
            waveFadeMultiplier={0.94}
            waveGrowth={0.13}
          />
        </Suspense>
      ) : null}
    </span>
  );
}

export function TeamDirectory() {
  const [open, setOpen] = useState<Profile | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const invoker = useRef<HTMLElement | null>(null);
  // Whether the press that ended in a click began on the backdrop too.
  const pressedBackdrop = useRef(false);

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

  const enter = (
    e: PointerEvent<HTMLButtonElement>,
    team: DirectoryTeam,
    person: DirectoryPerson,
  ) => {
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

  // The dialog is only ever opened by a card, and only by this.
  useEffect(() => {
    const el = dialog.current;
    if (open && el && !el.open) el.showModal();
  }, [open]);

  // Everyone this person is listed under: Rudransh Singh runs two events.
  const teams = open
    ? crewDirectory.filter((t) => t.people.some((p) => p.name === open.person.name))
    : [];

  return (
    <div className="dir">
      {/* The placeholder's figure, drawn once and used by every card. */}
      <svg className="dir-defs" aria-hidden="true" focusable="false">
        <symbol id="dir-person" viewBox="0 0 100 125">
          <circle cx="50" cy="46" r="17" />
          <path d="M16 125c0-26 14-41 34-41s34 15 34 41z" />
        </symbol>
      </svg>

      <p className="dir-hint">Select a card for details.</p>

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
                  <button
                    type="button"
                    className="dir-card"
                    aria-haspopup="dialog"
                    data-cursor-label="Open"
                    onClick={(e) => {
                      invoker.current = e.currentTarget;
                      setOpen({ team, person });
                    }}
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
                    <span className="dir-name">{person.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <dialog
        ref={dialog}
        className="dir-dialog"
        aria-labelledby={open ? "dir-profile-name" : undefined}
        data-accent={open?.team.accent}
        onClose={() => {
          setOpen(null);
          invoker.current?.focus();
        }}
        onPointerDown={(e) => {
          pressedBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          // The profile fills the dialog, so a click that lands on the dialog
          // itself is one on the dim backdrop. Dragging a selection out of the
          // profile and letting go over the backdrop is not.
          if (pressedBackdrop.current && e.target === e.currentTarget) e.currentTarget.close();
          pressedBackdrop.current = false;
        }}
      >
        {open ? (
          <div className="dir-profile" onPointerMove={parallax} onPointerLeave={settle}>
            <button
              type="button"
              className="dir-close"
              aria-label="Close"
              onClick={() => dialog.current?.close()}
            >
              <X size={16} aria-hidden="true" />
            </button>
            <Portrait person={open.person} />
            <div className="dir-profile-body">
              <p className="dir-profile-team">{listOf(teams.map((t) => t.heading))}</p>
              <h3 id="dir-profile-name" className="dir-profile-name">
                {open.person.name}
              </h3>
              <p className="dir-profile-role">{open.team.role}</p>
              {open.person.phone ? (
                <a className="btn btn-accent" href={telHref(open.person.phone)}>
                  Call {open.person.phone}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
