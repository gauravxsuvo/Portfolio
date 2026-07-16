/**
 * Apple-device detection, used only to label the palette's modifier key as ⌘
 * rather than ctrl.
 *
 * `navigator.platform` — what this replaced — is deprecated, and on an iPad it
 * reports "MacIntel", which is harmless here but is the kind of thing that stops
 * being harmless the moment someone reuses the check.
 *
 * `userAgentData.platform` is the supported replacement but is Chromium-only, so
 * the UA string stays as the fallback for Safari and Firefox. Both are trivially
 * spoofable; getting this wrong costs one wrong glyph in a keyboard hint, which
 * is the right amount to spend on it.
 */
type NavigatorUAData = { platform?: string };

export function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData })
    .userAgentData;
  if (uaData?.platform) return /mac/i.test(uaData.platform);

  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
}
