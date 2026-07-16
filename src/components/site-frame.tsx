import type { ReactNode } from "react";
import { SystemRail } from "@/components/system-rail";
import { SectionRail } from "@/components/section-rail";
import { PageNav } from "@/components/page-nav";
import { BackToTop } from "@/components/back-to-top";

/**
 * Three-column shell. Below xl the rails drop out entirely and this collapses to
 * the single centred column it always was — the rails are additive, so nothing
 * about the phone layout depends on them existing.
 *
 * The content column keeps its own max-width rather than stretching to fill: a
 * 1600px-wide line of monospace prose is unreadable, so the extra room on a big
 * display goes to the rails, not to longer lines.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[1] mx-auto flex w-full max-w-[100rem] flex-1 gap-8 px-4 sm:px-6 lg:px-8 2xl:gap-12">
      <SystemRail />

      {/* id is the skip link's target (see SkipLink in the root layout).
          tabIndex={-1} is what lets it receive focus programmatically — without
          it, following the skip link moves the scroll position but leaves focus
          stranded back in the nav, so the next Tab returns you to where you
          just escaped from. */}
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 py-10 outline-none">
        <div className="mx-auto w-full max-w-6xl">
          {children}
          <PageNav />
        </div>
      </main>

      <SectionRail />
      <BackToTop />
    </div>
  );
}
