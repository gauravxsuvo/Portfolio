"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({
  children,
  className = "",
  itemClassName = "",
  staggerMs = 0,
  trigger = "scroll",
}: {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  staggerMs?: number;
  trigger?: "scroll" | "mount";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === "mount") {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger]);

  const items = Children.toArray(children);

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          data-reveal-item="true"
          style={visible ? { transitionDelay: `${i * staggerMs}ms` } : undefined}
          className={`min-w-0 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          } ${itemClassName}`}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
