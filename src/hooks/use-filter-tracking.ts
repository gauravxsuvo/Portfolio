"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";

/**
 * Reports what people filter for, once they've stopped typing.
 *
 * The naive version — track on every change — is wrong twice over. It records
 * "p", "py", "pyt", "pyth"… as four separate searches, so the dashboard's top
 * term becomes whatever letter people start words with. And it ships four times
 * as much of someone's keystrokes as it needs to, which is exactly the sort of
 * thoughtless collection the rest of this codebase avoids.
 *
 * So: debounce until they settle, skip anything too short to be a real term,
 * and never report the same term twice in a row (backspacing to "pyth" and
 * retyping "python" is one search, not two).
 *
 * `resultCount` rides along because a filter with zero results is the
 * interesting case — it's someone looking for something that isn't there.
 */

const SETTLE_MS = 1200;
const MIN_LENGTH = 2;
const MAX_LENGTH = 40;

export function useFilterTracking(scope: string, query: string, resultCount: number) {
  const lastReported = useRef<string | null>(null);
  // Read inside the timer so the debounce doesn't restart when only the count
  // changes, and so the reported count is the one that matches the final term.
  const countRef = useRef(resultCount);
  useEffect(() => {
    countRef.current = resultCount;
  }, [resultCount]);

  useEffect(() => {
    const term = query.trim().toLowerCase();
    if (term.length < MIN_LENGTH || term.length > MAX_LENGTH) return;
    if (term === lastReported.current) return;

    const id = setTimeout(() => {
      lastReported.current = term;
      track("filter", { scope, term, results: countRef.current });
    }, SETTLE_MS);

    // Any further keystroke cancels the pending report, which is what makes
    // this "when they stop" rather than "every 1.2s while typing".
    return () => clearTimeout(id);
  }, [scope, query]);
}
