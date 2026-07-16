"use client";

import { BracketButton } from "@/components/ui/bracket-button";
import { writeConsent } from "@/lib/analytics/consent";
import { discardQueue } from "@/lib/analytics/client";
import { useConsent } from "@/hooks/use-consent";
import { useMounted } from "@/hooks/use-mounted";

/**
 * The withdraw/grant control on /privacy.
 *
 * "You can change your mind any time" is a promise the privacy page makes, and
 * a policy that says that without a working control is just a nicer-sounding
 * lie. It also has to be reachable *without* the banner, since the banner is
 * gone for good once you've answered it once.
 */
export function ConsentControls() {
  const consent = useConsent();
  // Consent can't be read during SSR, so the prerendered HTML would claim
  // "you haven't been asked yet" to everyone — including people who already
  // said yes — until hydration corrected it. Withholding the status until
  // mounted shows nothing rather than something false.
  const mounted = useMounted();

  const decide = (choice: "granted" | "denied") => {
    if (choice === "denied") discardQueue();
    writeConsent(choice);
  };

  if (!mounted) {
    return <p className="text-xs text-fg/30">checking your current setting...</p>;
  }

  const status =
    consent === "granted"
      ? "Analytics are ON for this browser."
      : consent === "denied"
        ? "Analytics are OFF for this browser."
        : "You haven't been asked yet on this browser.";

  return (
    <div className="border border-border p-3">
      <p className="mb-3 flex items-center gap-2 text-xs">
        <span
          aria-hidden="true"
          className={`inline-block h-1.5 w-1.5 ${
            consent === "granted" ? "bg-primary" : "bg-fg/30"
          }`}
        />
        <span className="text-fg/70">{status}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {consent !== "denied" && (
          <BracketButton variant="ghost" onClick={() => decide("denied")}>
            TURN ANALYTICS OFF
          </BracketButton>
        )}
        {consent !== "granted" && (
          <BracketButton onClick={() => decide("granted")}>TURN ANALYTICS ON</BracketButton>
        )}
      </div>
    </div>
  );
}
