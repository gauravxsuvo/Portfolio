"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "~/home" },
  { href: "/about", label: "~/about" },
  { href: "/projects", label: "~/projects" },
  { href: "/experience", label: "~/experience" },
  { href: "/contact", label: "~/contact" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link
          href="/"
          className="text-sm text-primary text-glow whitespace-nowrap"
        >
          guest@gaurav<span className="text-fg/50">:~$</span>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap gap-2 sm:ml-auto">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`border px-2.5 py-1 text-xs sm:text-sm transition-colors duration-100 ${
                  active
                    ? "bg-primary text-bg border-primary"
                    : "border-border text-fg/70 hover:text-primary hover:border-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
