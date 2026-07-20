"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function Typewriter({
  text,
  speed = 32,
  startDelay = 0,
  className = "",
  as: Tag = "span",
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const [count, setCount] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (count >= text.length) return;
    const delay = count === 0 ? startDelay : speed;
    const id = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(id);
  }, [count, text, speed, startDelay, reducedMotion]);

  const shown = reducedMotion ? text : text.slice(0, count);
  const done = reducedMotion || count >= text.length;

  return (
    // data-anim: on paper the print stylesheet shows the sr-only string and
    // drops the animated copy, which would otherwise print frozen mid-type.
    <Tag className={className} data-anim="">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {shown}
        <span className={done ? "animate-blink" : ""}>_</span>
      </span>
    </Tag>
  );
}
