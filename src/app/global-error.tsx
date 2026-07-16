"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself, which
 * error.tsx cannot — it lives *inside* that layout, so if the layout is what
 * broke, it never renders.
 *
 * That's why this file ships its own <html> and <body>: at this point nothing
 * from the layout is available, including the font variable, the theme script,
 * and every component. Everything here is deliberately self-contained and
 * inline-styled — importing a component would risk the import being the thing
 * that's broken, and a crashing error page is how a bad day becomes a blank
 * white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#33ff00",
          // The font stack is spelled out rather than using the CSS variable:
          // the layout that defines that variable is what failed.
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "34rem", width: "100%" }}>
          <p style={{ color: "#ff3333", fontSize: "0.875rem", marginBottom: "1rem" }}>
            [ERR] KERNEL PANIC
          </p>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "0.75rem" }}>
            The site failed to start. This one&apos;s properly broken — not a page, the whole
            shell.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "1rem" }}>
              reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #33ff00",
              background: "transparent",
              color: "#33ff00",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            [ REBOOT ]
          </button>
        </main>
      </body>
    </html>
  );
}
