/**
 * Consent gate.
 *
 * This site tracks persistent visitor identity, which under GDPR and India's
 * DPDP Act is not something you may do on a legitimate-interest basis — it
 * needs freely given, informed, prior opt-in. Three rules follow from that, and
 * they are the whole reason this module exists rather than a `localStorage.getItem`
 * inline somewhere:
 *
 *   1. Nothing is sent before a choice is made. Not a pageview, not a vital.
 *      "Ask, then track anyway while they read" is the most common way a cookie
 *      banner is illegal, and it's worse than having no banner at all — it's the
 *      same data collection plus a claim of compliance.
 *   2. Rejecting is exactly as easy as accepting. One click, same prominence.
 *      A banner with a big ACCEPT and a buried reject link does not collect
 *      valid consent.
 *   3. A choice, once made, is honoured until the visitor changes it — and they
 *      can always change it, from /privacy.
 *
 * `unset` is therefore the safe default in every failure mode, including
 * storage being unavailable: unknown means don't track.
 */

export const CONSENT_KEY = "suvo:analytics-consent";
export const VISITOR_KEY = "suvo:visitor-id";
export const SESSION_KEY = "suvo:session";
export const CONSENT_EVENT = "suvo:consent-change";

export type Consent = "unset" | "granted" | "denied";

/** Idle gap after which the next event starts a new session. Industry standard. */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function readConsent(): Consent {
  if (typeof window === "undefined") return "unset";
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw === "granted" || raw === "denied" ? raw : "unset";
  } catch {
    // Storage blocked (private mode, embedded webview, strict browser config).
    // We cannot record a choice, so we cannot have one: don't track.
    return "unset";
  }
}

export function writeConsent(consent: Exclude<Consent, "unset">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // ignore — the in-memory broadcast below still applies for this page view
  }
  // Withdrawing consent has to actually destroy the identifiers, not just stop
  // sending them. Leaving a visitor id in storage after a "no" means a later
  // "yes" silently re-links the two, which is precisely what "no" ruled out.
  if (consent === "denied") clearIdentifiers();
  broadcastConsent(consent);
}

export function clearIdentifiers(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(VISITOR_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function broadcastConsent(consent: Consent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
}

/**
 * crypto.randomUUID needs a secure context; it's absent on plain-http origins
 * and in some older embedded webviews. These ids are cache keys for grouping,
 * not security tokens, so a Math.random fallback is acceptable here — but it
 * would NOT be acceptable for the admin session, which is why that one is
 * signed server-side with node:crypto instead.
 */
function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable across visits. Only ever created once consent is granted. */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = randomId();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Ephemeral id for this page view only — better than dropping the event.
    return randomId();
  }
}

type StoredSession = { id: string; last: number };

/** Rolls over after 30 minutes of inactivity. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.id && typeof parsed.last === "number" && now - parsed.last < SESSION_TIMEOUT_MS) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, last: now }));
        return parsed.id;
      }
    }
    const id = randomId();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id, last: now }));
    return id;
  } catch {
    return randomId();
  }
}
