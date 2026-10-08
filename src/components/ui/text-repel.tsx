"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Fragment, useEffect, useRef } from "react";

interface TextRepelProps {
  /** The text to display */
  text: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** CSS classes applied to each letter */
  letterClassName?: string;
  /** Cursor influence radius in pixels */
  radius?: number;
  /** Maximum displacement strength in pixels */
  strength?: number;
  /** Interaction mode — push letters away or pull them toward the cursor */
  mode?: "repel" | "attract";
  /** Spring stiffness — higher = snappier return */
  stiffness?: number;
  /** Spring damping — lower = bouncier return */
  damping?: number;
  /** Spring mass — higher = heavier feel */
  mass?: number;
}

function RepelLetter({
  letter,
  mouseX,
  mouseY,
  radius,
  strength,
  mode,
  stiffness,
  damping,
  mass,
  className,
}: {
  letter: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  radius: number;
  strength: number;
  mode: "repel" | "attract";
  stiffness: number;
  damping: number;
  mass: number;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const originX = useRef(0);
  const originY = useRef(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness, damping, mass });
  const springY = useSpring(y, { stiffness, damping, mass });

  // Subtle tilt proportional to horizontal displacement
  const rotate = useTransform(springX, (v) => v * 0.3);

  // Capture original position relative to the container
  useEffect(() => {
    const capture = () => {
      if (!ref.current) return;
      const container = ref.current.closest("[data-text-repel]");
      if (!container) return;
      const cr = container.getBoundingClientRect();
      const lr = ref.current.getBoundingClientRect();
      originX.current = lr.left - cr.left + lr.width / 2;
      originY.current = lr.top - cr.top + lr.height / 2;
      // Lets a gradient run across the whole text though each letter paints
      // its own piece of it: see .repel-gradient.
      ref.current.style.setProperty("--rl-w", `${cr.width}px`);
      ref.current.style.setProperty("--rl-x", `${lr.left - cr.left}px`);
    };

    const raf = requestAnimationFrame(capture);
    window.addEventListener("resize", capture);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", capture);
    };
  }, []);

  // React to cursor position changes via motion value subscriptions
  useEffect(() => {
    const update = () => {
      const mx = mouseX.get();
      const my = mouseY.get();
      const dx = originX.current - mx;
      const dy = originY.current - my;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius && distance > 0) {
        // Quadratic falloff for natural-feeling force
        const force = (1 - distance / radius) ** 2 * strength;
        const angle = Math.atan2(dy, dx);
        const dir = mode === "attract" ? -1 : 1;
        x.set(Math.cos(angle) * force * dir);
        y.set(Math.sin(angle) * force * dir);
      } else {
        x.set(0);
        y.set(0);
      }
    };

    const unsub1 = mouseX.on("change", update);
    const unsub2 = mouseY.on("change", update);
    return () => {
      unsub1();
      unsub2();
    };
  }, [mouseX, mouseY, radius, strength, mode, x, y]);

  if (letter === " ") {
    return <span className="inline-block whitespace-pre"> </span>;
  }

  return (
    <motion.span
      ref={ref}
      className={cn("inline-block whitespace-pre will-change-transform", className)}
      style={{ x: springX, y: springY, rotate }}
      aria-hidden
    >
      {letter}
    </motion.span>
  );
}

export function TextRepel({
  text,
  className,
  letterClassName,
  radius = 120,
  strength = 45,
  mode = "repel",
  stiffness = 180,
  damping = 14,
  mass = 0.4,
}: TextRepelProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  return (
    <span
      ref={containerRef}
      data-text-repel
      className={cn(
        "inline-flex flex-wrap items-center justify-center cursor-default select-none",
        className,
      )}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }}
      onMouseLeave={() => {
        mouseX.set(-9999);
        mouseY.set(-9999);
      }}
      aria-label={text}
    >
      {/* Words stay whole and wrap between them; each letter moves on its own. */}
      {text.split(" ").map((word, w) => (
        <Fragment key={w}>
          {w > 0 ? <span className="inline-block whitespace-pre"> </span> : null}
          <span className="inline-flex whitespace-nowrap">
            {word.split("").map((letter, i) => (
              <RepelLetter
                key={i}
                letter={letter}
                mouseX={mouseX}
                mouseY={mouseY}
                radius={radius}
                strength={strength}
                mode={mode}
                stiffness={stiffness}
                damping={damping}
                mass={mass}
                className={letterClassName}
              />
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
