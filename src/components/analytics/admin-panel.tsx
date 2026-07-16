"use client";

import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { AdminLogin } from "@/components/analytics/admin-login";
import { Dashboard } from "@/components/analytics/dashboard";
import { useAdminSession } from "@/hooks/use-admin-session";

/**
 * Owns the session and swaps between the gate and the dashboard.
 *
 * The whole panel is client-rendered on purpose. The server can't know whether
 * you're logged in — there's no cookie to read — so the page it prerenders is
 * always the login screen, and the dashboard appears only once a token exists
 * in memory. That's the point: a refresh gets the prerendered login screen back
 * because nothing about the session survived it.
 */
export function AdminPanel({ configured }: { configured: boolean }) {
  const { token, timedOut, setToken, logout, expire } = useAdminSession();

  if (!configured) {
    return (
      <div>
        <SectionLabel index="--" label="Restricted" />
        <TerminalWindow title="auth" meta="LOCKED">
          <p className="max-w-prose text-sm text-error">
            ADMIN_PASSWORD and ADMIN_SECRET are not set on this deployment, so this page is
            unreachable by design. Set both and redeploy.
          </p>
        </TerminalWindow>
      </div>
    );
  }

  if (!token) {
    return (
      <div>
        <SectionLabel index="--" label="Restricted" />
        <TerminalWindow title="auth" meta="LOCKED">
          <AdminLogin onToken={setToken} timedOut={timedOut} />
        </TerminalWindow>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel index="--" label="Analytics" />
      <TerminalWindow title="analytics" meta="LIVE">
        <Dashboard
          token={token}
          onToken={setToken}
          // A 401 means the server aged the token out. Surfaced as a timeout,
          // not a plain logout, so the gate explains itself.
          onExpired={expire}
          onLogout={logout}
        />
      </TerminalWindow>
    </div>
  );
}
