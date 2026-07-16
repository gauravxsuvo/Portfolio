"use client";

import { useState, type FormEvent } from "react";
import { BracketButton } from "@/components/ui/bracket-button";

/**
 * The login gate.
 *
 * The password goes straight into a fetch body and is never held in component
 * state — an uncontrolled input plus FormData, so it exists only for the
 * lifetime of the submit handler rather than sitting in the React tree where
 * devtools (or a future careless log) can read it.
 */
export function AdminLogin({
  onToken,
  timedOut,
}: {
  onToken: (token: string) => void;
  timedOut: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const password = new FormData(form).get("password");
    if (typeof password !== "string" || !password) {
      setError("authentication failed.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? "authentication failed.");
        form.reset();
        return;
      }
      form.reset();
      onToken(data.token);
    } catch {
      setError("couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3">
      <label htmlFor="admin-password" className="text-xs text-fg/50">
        <span aria-hidden="true">$ </span>
        sudo analytics --login
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-describedby={error || timedOut ? "admin-msg" : undefined}
        aria-invalid={error ? true : undefined}
        className="border border-border bg-transparent px-3 py-2 text-sm text-fg outline-none placeholder:text-fg/25 focus-visible:border-primary"
        placeholder="password"
      />
      {/* One region for both messages. role=alert so a screen reader announces
          the failure instead of it being a purely visual change. */}
      {(error || timedOut) && (
        <p
          id="admin-msg"
          role="alert"
          className={`text-xs ${error ? "text-error" : "text-secondary"}`}
        >
          {error ?? "session ended after 5 minutes idle. log in again."}
        </p>
      )}
      <BracketButton type="submit" disabled={pending} className="self-start">
        {pending ? "AUTHENTICATING..." : "AUTHENTICATE"}
      </BracketButton>
    </form>
  );
}
