"use client";

import { useActionState } from "react";
import { BracketButton } from "@/components/ui/bracket-button";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: null };

/**
 * The login gate, styled as a shell auth prompt.
 *
 * useActionState keeps the password in a server action's FormData rather than
 * in React state — it never becomes a client-side variable, never lands in a
 * devtools component tree, and works with the form disabled or JS still loading.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
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
        aria-describedby={state.error ? "admin-error" : undefined}
        aria-invalid={state.error ? true : undefined}
        className="border border-border bg-transparent px-3 py-2 text-sm text-fg outline-none placeholder:text-fg/25 focus-visible:border-primary"
        placeholder="password"
      />
      {state.error && (
        // role=alert so a screen reader announces the failure; without it the
        // only feedback is a visual change the user may never hear about.
        <p id="admin-error" role="alert" className="text-xs text-error">
          {state.error}
        </p>
      )}
      <BracketButton type="submit" disabled={pending} className="self-start">
        {pending ? "AUTHENTICATING..." : "AUTHENTICATE"}
      </BracketButton>
    </form>
  );
}
