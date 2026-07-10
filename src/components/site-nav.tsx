"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { unlockAchievement } from "@/lib/achievements";

const LINKS = [
  { href: "/", label: "~/home" },
  { href: "/about", label: "~/about" },
  { href: "/projects", label: "~/projects" },
  { href: "/experience", label: "~/experience" },
  { href: "/contact", label: "~/contact" },
];

export function SiteNav() {
  const pathname = usePathname();
  const clickTimesRef = useRef<number[]>([]);
  const [showSudo, setShowSudo] = useState(false);

  function handlePromptClick() {
    const now = Date.now();
    clickTimesRef.current = [
      ...clickTimesRef.current.filter((t) => now - t < 800),
      now,
    ];
    if (clickTimesRef.current.length >= 3) {
      clickTimesRef.current = [];
      unlockAchievement("root");
      setShowSudo(true);
      setTimeout(() => setShowSudo(false), 2600);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="flex items-baseline gap-x-2 whitespace-nowrap">
            <Link href="/" className="glitch-hover text-primary text-glow">
              guest@gaurav
            </Link>
            <span
              role="button"
              tabIndex={0}
              onClick={handlePromptClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePromptClick();
                }
              }}
              aria-label="hidden prompt — try clicking it a few times"
              className="cursor-pointer select-none text-fg/50"
            >
              :~$
            </span>
          </span>
          {showSudo && (
            <span role="status" className="text-error">
              permission denied: guest is not in the sudoers file.
            </span>
          )}
        </div>
        <nav aria-label="Primary" className="flex flex-wrap gap-2 sm:ml-auto">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`glitch-hover border px-2.5 py-1 text-xs sm:text-sm transition-colors duration-100 ${
                  active
                    ? "bg-primary text-bg border-primary"
                    : "border-border text-fg/70 hover:text-primary hover:border-primary"
                }`}
              >
                {link.label}
                {active && (
                  <span aria-hidden="true" className="animate-blink">
                    _
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
