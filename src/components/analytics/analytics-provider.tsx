"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { track, flushNow } from "@/lib/analytics/client";
import { CONSENT_EVENT, type Consent } from "@/lib/analytics/consent";
import { ACHIEVEMENT_EVENT } from "@/lib/achievements";
import { THEME_CHANGE_EVENT, type ThemeChangeDetail } from "@/lib/theme";
import { SHELL_RUN_EVENT, OPEN_PALETTE_EVENT } from "@/lib/shell-events";
import { bio } from "@/lib/data";

/**
 * All instrumentation, in one place.
 *
 * The design rule here is that analytics must not colonise the codebase. The
 * alternative — a track() call inside the shell, the theme panel, every link,
 * every card — means the next person editing those files has to think about
 * analytics to change a button, and a deleted call site silently becomes a hole
 * in the data that nobody notices for months.
 *
 * So this component listens instead of being called. Three mechanisms:
 *   - Custom events the site *already* dispatched for its own reasons
 *     (suvo:achievement, suvo:theme-change) are simply subscribed to. Those
 *     components didn't change at all.
 *   - Outbound clicks use one delegated listener on document, so every link on
 *     every page is covered, including ones added later.
 *   - Route changes come from usePathname().
 *
 * Every listener is registered regardless of consent, and track() is the single
 * chokepoint that drops events when consent is absent. That's intentional: one
 * gate, checked in one place, rather than a condition on each of a dozen
 * listeners where the one that's forgotten is a privacy violation.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();

  // Web Vitals. Next calls this on its own schedule; track() gates on consent.
  useReportWebVitals((metric) => {
    track("web_vital", {
      metric: metric.name,
      // CLS is a unitless ratio and needs precision; the rest are milliseconds
      // where sub-ms detail is noise that only bloats the row.
      value: metric.name === "CLS" ? Number(metric.value.toFixed(4)) : Math.round(metric.value),
      rating: (metric as { rating?: string }).rating ?? "unknown",
    });
  });

  /* ------------------------------------------------------- pageview + timing */
  // Seeded to 0 rather than Date.now(): a default argument to useRef is
  // evaluated on every render, and reading the clock during render is impure.
  // The pageview effect below sets it before anything reads it.
  const enteredAt = useRef<number>(0);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // Referrer belongs only on the first pageview of a visit. document.referrer
    // keeps returning the original external URL across soft navigations, so
    // sending it every time would credit the same inbound link once per page
    // the visitor clicks through.
    const isFirst = lastPath.current === null;
    const referrer = isFirst ? document.referrer || null : null;

    track("pageview", referrer ? { referrer } : undefined, pathname);

    enteredAt.current = Date.now();
    lastPath.current = pathname;
  }, [pathname]);

  /* ------------------------------------------------------------ scroll depth */
  useEffect(() => {
    if (!pathname) return;
    // Per-path: re-created on navigation so each page gets its own buckets.
    const reached = new Set<number>();
    let ticking = false;

    const measure = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      // A page shorter than the viewport can't be scrolled; reporting 100% for
      // it would make every short page look perfectly read.
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100));
      for (const bucket of [25, 50, 75, 100]) {
        if (pct >= bucket && !reached.has(bucket)) {
          reached.add(bucket);
          track("scroll_depth", { pct: bucket }, pathname);
        }
      }
    };

    const onScroll = () => {
      // rAF-coalesced: scroll fires at input frequency and this must not be the
      // reason the site drops frames.
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  /* --------------------------------------------------------------- page exit */
  useEffect(() => {
    // visibilitychange->hidden is the only exit signal that fires reliably on
    // mobile Safari, where a tab switch or app background never fires
    // beforeunload/pagehide. Using it means "time on page" isn't systematically
    // missing for phone visitors.
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      // Unset means the pageview effect hasn't run yet, so there's no start
      // time to measure from — reporting now would emit a bogus 57-year dwell.
      if (enteredAt.current === 0) return;
      const seconds = Math.round((Date.now() - enteredAt.current) / 1000);
      // Guard both ends: 0s is a bounce artefact, and >1h means a tab was left
      // open overnight, which isn't "engagement".
      if (seconds > 0 && seconds < 3600) {
        track("page_exit", { seconds }, lastPath.current ?? undefined);
      }
      flushNow(true);
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, []);

  /* --------------------------------------------------------- outbound clicks */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Only real primary clicks. A middle-click opens a tab too, but ctrl/meta
      // clicks are already covered by the plain path and double-counting them
      // would inflate outbound numbers.
      if (e.defaultPrevented || e.button !== 0) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (href.startsWith("mailto:")) {
        track("email_click", { to: href.replace("mailto:", "").slice(0, 100) });
        return;
      }

      // Ignore in-page anchors and same-origin nav — those are pageviews.
      if (href.startsWith("#") || href.startsWith("/")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // Only real web destinations. Without this, a tel:/javascript:/blob: href
      // parses fine but has an empty hostname, and files an "outbound click to
      // nowhere" row that shows up in the dashboard as a blank-labelled bar.
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (!url.hostname) return;
      if (url.host === window.location.host) return;

      track("outbound", { host: url.hostname.replace(/^www\./, ""), to: label(url) });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  /* ------------------------------------- bridges to the site's own events */
  useEffect(() => {
    const onAchievement = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id) track("achievement", { id: detail.id });
    };
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent<ThemeChangeDetail>).detail;
      // Only the committed choice from the panel, not every frame of a drag —
      // a slider drag would otherwise emit hundreds of events per second.
      if (detail?.hex && detail.source !== "system") {
        track("theme_change", { hex: detail.hex, source: detail.source });
      }
    };
    const onShell = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; known: boolean }>).detail;
      if (detail?.name) track("shell_command", { name: detail.name, known: detail.known });
    };
    const onPalette = () => track("palette_open");

    window.addEventListener(ACHIEVEMENT_EVENT, onAchievement);
    window.addEventListener(THEME_CHANGE_EVENT, onTheme);
    window.addEventListener(SHELL_RUN_EVENT, onShell);
    window.addEventListener(OPEN_PALETTE_EVENT, onPalette);
    return () => {
      window.removeEventListener(ACHIEVEMENT_EVENT, onAchievement);
      window.removeEventListener(THEME_CHANGE_EVENT, onTheme);
      window.removeEventListener(SHELL_RUN_EVENT, onShell);
      window.removeEventListener(OPEN_PALETTE_EVENT, onPalette);
    };
  }, []);

  /* ------------------------------------------- backfill on late consent */
  useEffect(() => {
    const onConsent = (e: Event) => {
      const consent = (e as CustomEvent<Consent>).detail;
      // Someone who accepts after reading the banner has already viewed at
      // least one page. Without this, their first pageview — the one carrying
      // the external referrer that says how they found the site — is lost, and
      // every accepted visitor looks like they arrived on whatever page they
      // happened to be on when they clicked.
      if (consent === "granted") {
        track("pageview", { referrer: document.referrer || null }, window.location.pathname);
      }
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  // Nothing to draw. This component is all side effects.
  return null;
}

/** Friendly name for the destinations that actually matter to a portfolio. */
function label(url: URL): string {
  const host = url.hostname.replace(/^www\./, "");
  if (host.includes("github.com")) return "github";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("orcid.org")) return "orcid";
  if (host.includes("zenodo.org") || host.includes("doi.org")) return "publication";
  try {
    if (bio.website && host === new URL(bio.website).hostname.replace(/^www\./, "")) return "website";
  } catch {
    // bio.website malformed — fall through to the host label
  }
  return host;
}
