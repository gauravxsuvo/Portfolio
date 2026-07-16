"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkPassword, createSession, destroySession, isAuthConfigured } from "@/lib/analytics/auth";
import { getClientIp } from "@/lib/analytics/request";

export type LoginState = { error: string | null };

/**
 * Login throttle.
 *
 * A single-password admin page with no rate limit is a page with a password of
 * however many guesses fit in a minute. Per-instance and in-memory, with the
 * same caveat as the ingest limiter (instances don't share state) — but here it
 * is backed by a real password rather than being the only defence, so the goal
 * is just to make online brute force impractical rather than impossible.
 */
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    if (attempts.size > 1000) {
      for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > ATTEMPT_LIMIT;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return { error: "admin auth is not configured on this deployment." };
  }

  const ip = getClientIp(await headers()) ?? "unknown";
  if (tooManyAttempts(ip)) {
    return { error: "too many attempts. try again later." };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !checkPassword(password)) {
    // One message for both "no password given" and "wrong password". A more
    // specific error would confirm to a guesser which half they got right.
    return { error: "authentication failed." };
  }

  await createSession();
  // redirect() throws internally — it must be outside any try/catch, and
  // nothing may run after it.
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin");
}
