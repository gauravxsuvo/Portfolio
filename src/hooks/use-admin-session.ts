"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The admin session, held only in React state.
 *
 * Nothing is written to localStorage, sessionStorage, or a cookie — that's the
 * whole design. A refresh drops the heap and the token with it, and closing the
 * tab does the same. The lifetime is "this page, right now" because that's what
 * was asked for, and memory is the only store that has that lifetime natively.
 *
 * Two independent clocks end a session, and both matter:
 *
 *   - The server rejects a token older than five minutes. That's the real one:
 *     it holds even if this component is tampered with, because the check is
 *     server-side and the token is signed.
 *   - The idle timer below clears the token client-side after five minutes of
 *     no interaction. This is UX, not security — without it you'd sit on a
 *     stale dashboard until you clicked something and only *then* be kicked to
 *     the login screen, which reads as a bug rather than a policy.
 */

const IDLE_MS = 5 * 60 * 1000;

/** Interactions that count as "still here". Deliberately not `mousemove`:
 *  a stray cursor nudge shouldn't keep an unattended dashboard alive. */
const ACTIVITY_EVENTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;

export type SessionState = {
  token: string | null;
  /** True once an idle timeout has ended the session, so the login screen can
   *  explain itself rather than looking like a random logout. */
  timedOut: boolean;
};

export function useAdminSession() {
  const [state, setState] = useState<SessionState>({ token: null, timedOut: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors state.token so the activity listeners can read it without being
  // re-registered on every token swap (which happens on every fetch).
  const tokenRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const endSession = useCallback(
    (timedOut: boolean) => {
      clearTimer();
      tokenRef.current = null;
      setState({ token: null, timedOut });
    },
    [clearTimer]
  );

  const armIdleTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => endSession(true), IDLE_MS);
  }, [clearTimer, endSession]);

  /** Store a token (from login or a refreshed response) and restart the clock. */
  const setToken = useCallback(
    (token: string) => {
      tokenRef.current = token;
      setState({ token, timedOut: false });
      armIdleTimer();
    },
    [armIdleTimer]
  );

  /** Deliberate sign-out — no "you were timed out" message. */
  const logout = useCallback(() => endSession(false), [endSession]);

  /**
   * The server rejected the token as too old. Distinct from logout() so the
   * login screen can say why: an unexplained bounce back to a password prompt
   * reads as a bug, and the honest message is that the session expired.
   */
  const expire = useCallback(() => endSession(true), [endSession]);

  // Any interaction while signed in resets the idle countdown.
  useEffect(() => {
    const onActivity = () => {
      if (tokenRef.current) armIdleTimer();
    };
    for (const e of ACTIVITY_EVENTS) {
      window.addEventListener(e, onActivity, { passive: true });
    }
    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity);
    };
  }, [armIdleTimer]);

  // Don't leave a timer running after unmount.
  useEffect(() => clearTimer, [clearTimer]);

  return { token: state.token, timedOut: state.timedOut, setToken, logout, expire };
}
