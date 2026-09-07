import { useEffect, useRef, useState } from "react";
import videoAsset from "@/assets/quantum-descent.mp4.asset.json";
import posterAsset from "@/assets/quantum-poster.jpg.asset.json";
import { events, hologramKeyframes, timeline, type Keyframe } from "@/data/quantum";

/** Scroll distance (in viewport heights) that the pinned descent consumes. */
const SCROLL_VH = 7;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sampleKeyframes(kfs: Keyframe[], t: number): Keyframe {
  const first = kfs[0]!;
  const last = kfs[kfs.length - 1]!;
  if (t <= first.t) return first;
  if (t >= last.t) return last;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]!;
    const b = kfs[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return { t, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k) };
    }
  }
  return last;
}

function fade(t: number, start: number, end: number, ramp: number) {
  if (t <= start - ramp || t >= end + ramp) return 0;
  if (t < start) return (t - (start - ramp)) / ramp;
  if (t > end) return 1 - (t - end) / ramp;
  return 1;
}

export function ScrollDescent() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const grateRef = useRef<HTMLDivElement | null>(null);
  const hotspotRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<string | null>(null);


  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    let raf = 0;
    let current = 0;
    let seeking = false;

    const onSeeked = () => {
      seeking = false;
    };
    video.addEventListener("seeked", onSeeked);

    const duration = () => (Number.isFinite(video.duration) ? video.duration : timeline.duration);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      const target = progress * duration();

      // Smooth the seek so fast wheel input doesn't produce a hard jump.
      current = lerp(current, target, 0.18);
      if (Math.abs(current - target) < 0.004) current = target;

      if (!seeking && Math.abs(video.currentTime - current) > 1 / 60) {
        seeking = true;
        try {
          video.currentTime = current;
        } catch {
          seeking = false;
        }
      }

      const t = current;

      if (titleRef.current) {
        const o = 1 - Math.min(1, t / (timeline.aerial[1] * 0.55));
        titleRef.current.style.opacity = String(o);
        titleRef.current.style.transform = `translate3d(0, ${(1 - o) * -40}px, 0)`;
      }

      const [hs, he] = timeline.holograms;
      events.forEach((event, i) => {
        const el = hotspotRefs.current[i];
        if (!el) return;
        const o = fade(t, hs, he, 0.55);
        el.style.opacity = String(o);
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
        if (o <= 0) return;
        const kf = sampleKeyframes(hologramKeyframes[event.id]!, t);
        el.style.transform = `translate3d(calc(${kf.x}vw - 50%), calc(${kf.y}vh - 50%), 0) scale(${kf.s.toFixed(3)})`;
      });

      if (grateRef.current) {
        const o = fade(t, timeline.sewer[0], timeline.duration, 0.45);
        grateRef.current.style.opacity = String(o);
        grateRef.current.style.transform = `translate3d(0, ${(1 - o) * 28}px, 0)`;
      }

    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [reducedMotion]);

  // Loading gate: fully buffer the file first so scrubbing never waits on
  // range requests mid-scroll (all-keyframe encode + local blob = instant seeks).
  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const res = await fetch(videoAsset.url);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(videoAsset.url);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    const check = () => setReady(video.readyState >= 3);
    check();
    video.addEventListener("loadeddata", check);
    video.addEventListener("canplaythrough", check);
    return () => {
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("canplaythrough", check);
    };
  }, [src]);


  const titleCard = (
    <div ref={titleRef} className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-1/2 top-[16%] w-full -translate-x-1/2 px-6 text-center">
        <h1 className="font-display text-[19vw] font-bold leading-[0.82] tracking-tight text-foreground drop-shadow-[0_0_38px_oklch(0.85_0.14_197_/_0.45)] sm:text-[15vw] lg:text-[11rem]">
          <span className="block">QUANTUM</span>
          <span className="block text-gradient-neon">V2.0</span>
        </h1>
        <p className="mt-5 text-sm font-medium tracking-[0.35em] text-muted-foreground uppercase sm:text-base">
          A.F.S. Bal Bharati School
        </p>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
        <span className="eyebrow">Scroll to descend</span>
        <div className="scroll-hint mx-auto mt-3 h-8 w-px bg-gradient-to-b from-cyan to-transparent" />
      </div>
    </div>
  );

  if (reducedMotion) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-ink">
        <img
          src={posterAsset.url}
          alt="Quantum V2.0 — a full moon over a neon city skyline with a vertical beam of light"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-background" />
        {titleCard}
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-24 pt-40">
          <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
            Motion is reduced on your device, so the descent is shown as a still. Every event below
            is fully available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${SCROLL_VH * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          {...(src ? { src } : {})}
          poster={posterAsset.url}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/45" />

        {titleCard}

        {/* Hologram hotspots over the building ad panels */}
        <div className="absolute inset-0 z-30">
          {events.map((event, i) => (
            <div
              key={event.id}
              ref={(el) => {
                hotspotRefs.current[i] = el;
              }}
              className="holo"
              data-accent={event.accent}
              style={{ opacity: 0 }}
            >
              <a
                className="holo-panel"
                href={event.routing.mode === "brochure" ? event.routing.target : event.routing.target}
                {...(event.routing.mode === "brochure"
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
              >
                <span className="holo-meta">{event.team}</span>
                <span className="holo-name mt-1 block">{event.name}</span>
              </a>
            </div>
          ))}
        </div>

        {/* Sewer reveal — the team lives down here */}
        <div
          ref={grateRef}
          id="team"
          className="absolute inset-0 z-30 flex items-center justify-center px-6 py-16"
          style={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink/90" />
          <div className="relative mx-auto w-full max-w-5xl text-center">
            <span className="eyebrow">Below street level</span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Meet the crew in the tunnels
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Quantum is student-run end to end — events, tech, design, media and logistics.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {team.map((member, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/70 bg-card/70 p-4 text-left backdrop-blur-sm"
                >
                  <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-cyan/70 to-magenta/70" />
                  <p className="mt-3 font-display text-sm font-semibold sm:text-base">
                    {member.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>


        {!ready && (
          <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border bg-ink/70 px-4 py-2 text-xs tracking-[0.2em] text-muted-foreground uppercase backdrop-blur">
            Loading descent…
          </div>
        )}
      </div>
    </section>
  );
}
