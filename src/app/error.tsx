"use client";

import { useEffect } from "react";
import { BracketButton, BracketLink } from "@/components/ui/bracket-button";

/**
 * Route-level error boundary.
 *
 * Without this file, any client component that throws in production drops the
 * visitor onto Next's built-in error page: unstyled, white, and the one screen
 * on this site that looks nothing like the site. A crash is bad; a crash that
 * also breaks the illusion the whole thing is built around is worse.
 *
 * It renders inside the root layout, so nav, footer and theme survive — the
 * visitor keeps a way out rather than a dead end.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel captures console.error from the client into the runtime logs. This
    // site has no error-reporting service and doesn't need one, but a crash
    // that leaves no trace anywhere is a crash nobody will ever fix.
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-error text-glow">[ERR] 500: UNHANDLED EXCEPTION</p>
      <p className="text-sm text-fg/70">
        Something in this page threw and I didn&apos;t catch it. That&apos;s a bug on my
        side, not anything you did.
      </p>
      {/* The digest is the only handle on the real stack trace, which stays on
          the server — surfacing it means a bug report can actually be traced.
          The message itself is deliberately not rendered: in production it may
          carry internals, and React redacts it here anyway. */}
      {error.digest && (
        <p className="text-xs text-fg/40">
          reference: <span className="text-secondary">{error.digest}</span>
        </p>
      )}
      <p className="text-xs text-fg/40">
        tip: <span className="text-secondary">retry</span> usually works if it was a blip.
        If it keeps happening, I&apos;d genuinely like to know.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <BracketButton onClick={reset}>RETRY</BracketButton>
        <BracketLink href="/" variant="ghost">
          cd ~
        </BracketLink>
      </div>
    </div>
  );
}
