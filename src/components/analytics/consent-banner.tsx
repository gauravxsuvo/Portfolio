"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BracketButton } from "@/components/ui/bracket-button";
import { writeConsent } from "@/lib/analytics/consent";
import { discardQueue } from "@/lib/analytics/client";
import { useBooted, useConsent } from "@/hooks/use-consent";

const LINK = "text-primary underline underline-offset-2 decoration-border hover:text-glow";

/**
 * The consent prompt: one line, two buttons, links to the detail.
 *
 * The copy is short on purpose. An earlier version explained the visitor ID,
 * the lack of ad networks and the right to withdraw inline, which was ~260px of
 * text on a phone — a banner nobody reads is worse than a short one they do,
 * and it made the site's first impression a legal notice. Consent still has to
 * be *informed*, but the standard (and legally accepted) way to do that is a
 * plain statement of what's happening plus a link to the full policy, which is
 * what /privacy and /cookies are for.
 *
 * Deliberate choices that are legal requirements, not styling:
 *
 *   - ACCEPT and DECLINE are the same component, same size, same prominence.
 *     A visually dominant accept button is the single most common way a consent
 *     banner fails to collect valid consent — "freely given" doesn't survive a
 *     dark pattern.
 *   - There is no X / dismiss. Dismissal isn't consent, so a close button would
 *     either be a silent "no" (then why have it) or a silent "yes" (unlawful).
 *     The choice is the only way out.
 *   - It does not trap focus or block the page. This is a portfolio, not a
 *     paywall; someone who wants to ignore it and read about DeepDarcy can.
 *     Nothing is tracked while they do.
 */
export function ConsentBanner() {
  const consent = useConsent();
  // The boot screen is a full-viewport dialog living outside this component's
  // tree, at a lower z-index. Painting a consent bar over it would step on the
  // first thing a new visitor ever sees — and a prompt shown over an animation
  // someone is still watching isn't a fair moment to ask for a decision anyway.
  const booted = useBooted();
  const pathname = usePathname();

  const decide = (choice: "granted" | "denied") => {
    if (choice === "denied") discardQueue();
    writeConsent(choice);
  };

  // /admin is my own dashboard and is never tracked (see client.ts isExcluded),
  // so asking for consent there would be asking about collection that isn't
  // happening — and it would sit over the stats.
  const onAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  if (consent !== "unset" || !booted || onAdmin) return null;

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-bg/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:gap-6 md:py-3.5">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-fg/60 sm:text-[13px]">
          <span className="text-secondary" aria-hidden="true">
            $ analytics --consent{" "}
          </span>
          <span className="text-fg/70">
            This site uses first-party analytics to measure traffic. No advertising, no
            third-party trackers, nothing sold.
          </span>{" "}
          <Link href="/privacy" className={LINK}>
            Privacy
          </Link>
          <span className="px-1 text-border" aria-hidden="true">
            ·
          </span>
          <Link href="/cookies" className={LINK}>
            Cookies
          </Link>
        </p>

        {/* Equal visual weight, and DECLINE first in DOM order so a keyboard or
            screen-reader user reaches the privacy-preserving option first. */}
        <div className="flex shrink-0 gap-2.5">
          <BracketButton onClick={() => decide("denied")} variant="ghost">
            DECLINE
          </BracketButton>
          <BracketButton onClick={() => decide("granted")}>ACCEPT</BracketButton>
        </div>
      </div>
    </div>
  );
}
