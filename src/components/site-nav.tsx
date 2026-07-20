"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { unlockAchievement } from "@/lib/achievements";
import { ScrollProgress } from "@/components/scroll-progress";
import { OPEN_PALETTE_EVENT } from "@/lib/shell-events";
import { useMounted } from "@/hooks/use-mounted";
import { SITE_ROUTES } from "@/lib/routes";
import { isAppleDevice } from "@/lib/platform";
import { retroAccentStyle } from "@/lib/ansi";

export function SiteNav() {
  const pathname = usePathname();
  const clickTimesRef = useRef<number[]>([]);
  const [showSudo, setShowSudo] = useState(false);
  const mounted = useMounted();
  const navRef = useRef<HTMLElement>(null);

  /**
   * Bring the active route into view in the phone scroller.
   *
   * Six routes do not fit on a phone, so ~/publications and ~/contact start
   * off-screen — which meant landing on /contact from a link showed a nav with
   * no visible current tab, and the two right-most routes were invisible with
   * no hint they existed. The fade mask below advertises that there is more;
   * this makes sure the tab you are actually on is one of the ones you can see.
   *
   * `inline: "nearest"` so a route already fully visible doesn't get yanked,
   * and `block: "nearest"` so scrolling the tab strip can never scroll the page
   * itself — the default ("start") pulls the whole sticky header into view and
   * jumps you down the document on every navigation.
   */
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    active.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [pathname]);

  // Derived, not stored: the server has no idea what OS the visitor is on, so it
  // renders the neutral label and the client swaps it after hydration.
  const modKey = mounted && isAppleDevice() ? "⌘" : "ctrl";

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
      <div className="relative mx-auto flex max-w-[100rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="flex items-baseline gap-x-2 whitespace-nowrap">
            <Link href="/" className="tap-target-sm glitch-hover text-primary text-glow">
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
              aria-label="hidden prompt, try clicking it a few times"
              className="tap-target-sm cursor-pointer select-none text-fg/50"
            >
              :~$
              <span aria-hidden="true" className="blink-hard ml-0.5 text-primary">
                _
              </span>
            </span>
          </span>
          {showSudo && (
            <span role="status" className="text-error">
              permission denied: guest is not in the sudoers file.
            </span>
          )}
        </div>

        {/* items-start, not items-center: between ~640px and ~900px the six
            routes wrap onto two rows, and centring left the ctrl+K button
            floating in the gap between them — attached to nothing, aligned with
            nothing. Aligning to the top puts it level with the first row of
            tabs at every width, including the single-row case where the two
            are the same height anyway. */}
        <div className="flex min-w-0 items-start gap-2 sm:ml-auto">
          {/* Phone: one bleed-to-edge scrollable row (-mx-4 px-4), because six
              routes stacked into two lines eats a third of a small screen.
              Tablet and up: allowed to wrap instead.

              min-w-0 rather than the flex-none this used to carry — flex-none
              sizes the row to max-content, which means flex-wrap can never
              actually wrap, and at ~768px the nav simply ran 145px off the side
              of the page. */}
          {/* nav-scroller fades the right edge on phones so the routes that
              start off-screen are visibly cut off rather than looking like the
              end of the list. It's a mask, not an overlay: an overlaid
              gradient would need a background colour to fade *to*, and the
              header is translucent over the mist. */}
          <nav
            ref={navRef}
            aria-label="Primary"
            className="nav-scroller -mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0"
          >
            {SITE_ROUTES.map((link, i) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  style={retroAccentStyle(i)}
                  className={`tap-target glitch-hover shrink-0 border px-2.5 py-1 text-xs transition-colors duration-100 sm:text-sm ${
                    active
                      ? "retro-fill border-primary bg-primary text-bg"
                      : "retro-hover border-border text-fg/70 hover:border-primary hover:text-primary"
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
