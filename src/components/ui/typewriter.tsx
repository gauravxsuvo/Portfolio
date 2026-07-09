"use client";

import { useEffect, useState } from "react";

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
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setCount(text.length);
      return;
    }
    if (count >= text.length) return;
    const delay = count === 0 ? startDelay : speed;
    const id = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(id);
  }, [count, text, speed, startDelay, reducedMotion]);

  const done = count >= text.length;

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span className={done ? "animate-blink" : ""}>_</span>
      </span>
    </Tag>
  );
}
