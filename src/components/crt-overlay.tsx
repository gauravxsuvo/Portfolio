export function CrtOverlay() {
  return (
    <div className="crt-overlay" aria-hidden="true">
      {/* The refresh bar drifting down the tube. A child rather than another
          pseudo-element on .crt-overlay: both of its pseudos are taken (the
          vignette and the scroll-warp band), and this one needs its own
          transform anyway — the parent is already running the scanline scroll. */}
      <div className="crt-refresh" />
    </div>
  );
}
