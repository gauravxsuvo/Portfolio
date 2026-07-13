"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { unlockAchievement } from "@/lib/achievements";
import { ScrollProgress } from "@/components/scroll-progress";
import { OPEN_PALETTE_EVENT } from "@/lib/shell-events";
import { useMounted } from "@/hooks/use-mounted";

const LINKS = [
  { href: "/", label: "~/home" },
  { href: "/about", label: "~/about" },
  { href: "/projects", label: "~/projects" },
  { href: "/experience", label: "~/experience" },
  { href: "/publications", label: "~/publications" },
  { href: "/contact", label: "~/contact" },
];

export function SiteNav() {
  const pathname = usePathname();
  const clickTimesRef = useRef<number[]>([]);
  const [showSudo, setShowSudo] = useState(false);
  const mounted = useMounted();

  // Derived, not stored: the server has no idea what OS the visitor is on, so it
  // renders the neutral label and the client swaps it after hydration.
  const modKey =
    mounted && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
      ? "⌘"
      : "ctrl";

  function handlePromptClick() {
    const now = Date.now();
    clickTimesRef.current = [...clickTimesRef.current.filter((t) => now - t < 800), now];
    if (clickTimesRef.current.length >= 3) {
      clickTimesRef.current = [];
      unlockAchievement("root");
      setShowSudo(true);
      setTimeout(() => setShowSudo(false), 2600);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:px-6">
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

        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Horizontal scroll rather than a second wrapped row: six routes at
              phone widths otherwise push the nav to two lines and shove the page
              down. -mx-4 px-4 lets the row bleed to the screen edges so it reads
              as scrollable. */}
          <nav
            aria-label="Primary"
            className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-none sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          >
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`glitch-hover shrink-0 border px-2.5 py-1 text-xs transition-colors duration-100 sm:text-sm ${
                    active
                      ? "border-primary bg-primary text-bg"
                      : "border-border text-fg/70 hover:border-primary hover:text-primary"
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

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
            aria-label="Open command palette"
            title="Command palette"
            className="hidden shrink-0 items-center gap-1.5 border border-border px-2 py-1 text-xs text-fg/50 transition-colors hover:border-primary hover:text-primary sm:inline-flex"
          >
            <span aria-hidden="true">⌕</span>
            <kbd className="text-[10px]">{modKey}+K</kbd>
          </button>
        </div>

        <ScrollProgress />
      </div>
    </header>
  );
}
