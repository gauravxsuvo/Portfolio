const SOCIALS = [
  { label: "github", href: "https://github.com/" },
  { label: "linkedin", href: "https://www.linkedin.com/" },
  { label: "email", href: "mailto:gauravrajsinghoppo@gmail.com" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-fg/50">
        <span className="text-primary">[OK]</span>
        <span>STATUS: ONLINE</span>
        <span aria-hidden="true" className="hidden sm:inline">
          //
        </span>
        <nav aria-label="Social" className="flex flex-wrap gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="hover:text-primary transition-colors"
            >
              ./{s.label}
            </a>
          ))}
        </nav>
        <span className="sm:ml-auto">
          © {year} GAURAV RAJ SINGH — BUILT WITH NEXT.JS
        </span>
      </div>
    </footer>
  );
}
