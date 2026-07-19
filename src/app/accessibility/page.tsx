import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { bio } from "@/lib/data";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "cat accessibility.txt",
  description:
    "How accessible this site is, what's been done, and where it honestly falls short.",
  path: "/accessibility",
});

const LAST_UPDATED = "2026-07-19";

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-secondary">
      {children}
    </h3>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <section className="mb-6 last:mb-0">{children}</section>;
}

function A({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = "text-primary underline underline-offset-4 decoration-border hover:text-glow";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Only claims that are actually true of the code. */
const DONE: string[] = [
  "Every animation respects prefers-reduced-motion. If your OS says you don't want motion, the scanlines stop, the cursor trail disappears, and transitions collapse to nothing.",
  "The boot sequence, the command palette and the shortcuts overlay are real dialogs: they trap focus while open, close on Escape, and mark the rest of the page inert so a screen reader doesn't wander into it.",
  "Decorative effects are hidden from assistive tech rather than read aloud. The typewriter effect keeps the full sentence in a screen-reader-only element and only animates a copy marked aria-hidden, so you hear the finished text, not one letter at a time.",
  "Everything works from the keyboard, with visible focus rings that aren't removed. A skip link is the first thing you reach on every page.",
  "The whole site works without JavaScript for reading: content is server-rendered, and the boot overlay removes itself if JS never runs.",
  "Live regions announce things that change on their own — the copy button's confirmation, the projects filter's result count.",
];

/** Written plainly, because an accessibility statement that only lists wins is marketing. */
const SHORTFALLS: { title: string; detail: string }[] = [
  {
    title: "The whole thing is monospace on black",
    detail:
      "That's the point of the design, but it's a real tradeoff. Monospace is harder to read at length for some people with dyslexia, and the pixel-style heading font trades some legibility for the CRT look (body text stays in a normal monospace). Every colour in all five built-in palettes — the four retro ones and the single-phosphor mono mode — clears WCAG AA contrast on the background, the dimmest at about 6:1. But if a low-contrast custom colour is picked in display settings, that guarantee is gone — the picker lets you make it unreadable and I haven't clamped it.",
  },
  {
    title: "The shell is not a great screen reader experience",
    detail:
      "It's a text input that prints output above itself. Output is announced, but it's a novelty interface, not a well-trodden pattern. Everything the shell can show you is also a normal page you can navigate to — nothing is shell-only.",
  },
  {
    title: "The CRT overlay and cursor trail are cosmetic noise",
    detail:
      "Both can be turned off (display settings, or reduced-motion does it for you), but they're on by default, and a default that assumes nobody minds is a choice I made for aesthetics.",
  },
  {
    title: "Things move on their own",
    detail:
      "Several effects loop continuously with no input from you: the name at the top cycles colours, a light sweeps each section divider, a faint band drifts down the screen like a CRT refresh, a coloured haze drifts behind everything, and small cursors blink. They're deliberately slow and low-contrast, and nothing blinks fast enough to be a seizure risk, but motion that never stops can still be distracting or worse if you're sensitive to it. Every one of them stops completely if your system asks for reduced motion — tested rather than assumed, and the blinking glyphs stay visible rather than freezing invisible.",
  },
  {
    title: "It hasn't been audited",
    detail:
      "No formal WCAG audit, no professional screen reader testing. I've done what I know how to do and tested with a keyboard and the tools I have. That's not the same as being verified, and I'd rather say so than imply a level of assurance that doesn't exist.",
  },
];

export default function AccessibilityPage() {
  return (
    <div>
      <SectionLabel index="00" label="Accessibility" />
      <TerminalWindow title="accessibility.txt" meta="R/O" className="trace-box">
        <div className="prose-measure flex flex-col text-sm text-fg/70">
          <p className="mb-6 text-fg">
            I want this site to work for you. It&apos;s a deliberately theatrical design, and
            some of that theatre works against accessibility — so here&apos;s an honest
            account of what&apos;s been done and where it falls short, rather than a badge
            claiming compliance.
          </p>

          <Section>
            <H3>Where it stands</H3>
            <p>
              The target is{" "}
              <A href="https://www.w3.org/TR/WCAG22/" external>
                WCAG 2.2 Level AA
              </A>
              . I believe the site substantially meets it, with the caveats below. That&apos;s
              a self-assessment by one person, not a certified audit — treat it as a
              good-faith claim rather than a guarantee.
            </p>
          </Section>

          <Section>
            <H3>What&apos;s been done</H3>
            <ul className="ml-4 flex list-disc flex-col gap-2 marker:text-border">
              {DONE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section>
            <H3>Where it falls short</H3>
            <p className="mb-3">
              An accessibility statement that only lists wins is marketing. These are the
              real ones:
            </p>
            <dl className="flex flex-col gap-3 border border-border p-3 text-xs sm:text-sm">
              {SHORTFALLS.map((s) => (
                <div key={s.title}>
                  <dt className="mb-1 text-fg/50">{s.title}</dt>
                  <dd>{s.detail}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section>
            <H3>Turning the theatre off</H3>
            <p>
              The display panel (the{" "}
              <span className="text-secondary">[DISPLAY]</span> control, or{" "}
              <code className="text-fg/50">theme</code>{" "}
              in the shell) switches off the CRT overlay, swaps between the colorful retro
              mode and a single-color mono mode, and lets you pick your own colour. Setting
              &quot;reduce motion&quot; in your operating system does most of it
              automatically, without touching anything here.
            </p>
          </Section>

          <Section>
            <H3>If something doesn&apos;t work</H3>
            <p>
              Please tell me — <A href={`mailto:${bio.email}`}>{bio.email}</A>. If something
              here blocks you, that&apos;s a bug and I&apos;d rather fix it than not know.
              Tell me what you were using and what happened; I&apos;ll reply and I&apos;ll
              actually fix it.
            </p>
          </Section>

          <Section>
            <H3>Changes</H3>
            <p>Last updated: {LAST_UPDATED}.</p>
          </Section>
        </div>
      </TerminalWindow>
    </div>
  );
}
