import { X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Reveal } from "@/components/scene/Reveal";
import {
  crewDirectory,
  type DirectoryPerson,
  type DirectoryTeam,
} from "@/components/site/crewDirectory";
import { listOf } from "@/data/quantum";
import { telHref } from "@/lib/utils";

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

function Portrait({ person }: { person: DirectoryPerson }) {
  return (
    <span className="dir-slot" data-photo={person.photo ? "" : undefined} aria-hidden="true">
      {person.photo ? (
        <img src={person.photo} alt="" width={480} height={600} loading="lazy" decoding="async" />
      ) : (
        <svg className="dir-silhouette" focusable="false">
          <use href="#dir-person" />
        </svg>
      )}
    </span>
  );
}

export function TeamDirectory() {
  const [open, setOpen] = useState<Profile | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const invoker = useRef<HTMLElement | null>(null);
  // Whether the press that ended in a click began on the backdrop too.
  const pressedBackdrop = useRef(false);

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
                    onPointerMove={aim}
                    onPointerLeave={release}
                  >
                    <Portrait person={person} />
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
          <div className="dir-profile">
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
