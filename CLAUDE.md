@AGENTS.md

# Portfolio — gauravxsuvo/Portfolio

Personal portfolio site for Gaurav Raj Singh, a software developer. Built as a
"Terminal CLI" themed site — it should look and feel like a clean ZSH/Bash
shell session (prompts, brackets, ASCII dividers), not a generic template.

## Stack

- Next.js 16 (App Router), TypeScript, React 19
- Tailwind CSS v4 — tokens live in `src/app/globals.css` via `@theme`, there is
  **no** `tailwind.config.js`. Don't go looking for one.
- No component library (no shadcn/ui, no MUI). All UI primitives are
  hand-built in `src/components/ui/` to match the design system below.
- No backend/CMS. Content is static data in `src/lib/data.ts`.

## Structure

- `src/app/` — routes: `/`, `/about`, `/projects`, `/projects/[slug]`,
  `/experience`, `/contact`, plus `not-found.tsx`.
- `src/components/ui/` — reusable primitives: `TerminalWindow`, `BracketButton`
  / `BracketLink`, `ProgressBar`, `StatusBadge`, `SectionLabel`, `PromptInput`,
  `Typewriter`.
- `src/components/` — page-level/layout pieces: `site-nav.tsx`,
  `site-footer.tsx`, `crt-overlay.tsx`, `projects-explorer.tsx` (client-side
  project filter).
- `src/lib/data.ts` — all site content (bio, projects, experience, skills).
  Edit this file to update content; avoid hardcoding text into page
  components.

## Design system rules

Keep new UI consistent with these — they're deliberate, not defaults:

- **Monospace everywhere.** No secondary font. `font-mono` (JetBrains Mono)
  applies globally from the root layout.
- **Zero border radius, always.** Enforced globally in `globals.css`
  (`* { border-radius: 0 !important; }`). Never add `rounded-*` classes.
- **No drop shadows.** Only the green `text-glow` text-shadow utility, used on
  primary/active text.
- **Colors are tokens, not hex.** Use `bg`, `fg`, `primary` (`#33ff00` green),
  `secondary` (`#ffb000` amber), `muted`/`border` (`#1f521f` dim green),
  `error` (`#ff3333`). Reserve `muted` for borders/dividers — it fails
  contrast as body text on black.
- **Reuse the primitives** in `src/components/ui/` (bracket buttons, terminal
  windows, status badges, progress bars) instead of one-off styled divs.
- **Motion respects `prefers-reduced-motion`.** Any new animation must degrade
  gracefully — see the media query at the bottom of `globals.css`.
- **Accessibility over aesthetics when they conflict.** E.g. `Typewriter`
  keeps the full string in an `sr-only` span and only animates a decorative
  `aria-hidden` copy — follow that pattern for any similar effect.

## Verifying changes

There's no test suite. To verify UI changes: `npm run build` (typecheck +
static generation for all routes) and visually check the affected route(s) in
a browser — Playwright via a throwaway script works well since this project
has no dev-only browser tooling installed.

## Commits

Do not add Claude/Anthropic as a commit co-author or contributor anywhere in
this repo (commit trailers, `package.json` `author` field, etc.). This is a
personal project under one author.

## About the author

Gaurav Raj Singh — software developer, based in India
(`gauravrajsinghoppo@gmail.com`, GitHub: `gauravxsuvo`). Focus areas per the
current bio: distributed systems, developer tooling, networking, web
performance.

**Important:** the specific content in `src/lib/data.ts` (employers "Acme
Systems"/"Nimbus Data", project names like `packet-sniffer-dashboard`, skill
percentages, education details) is placeholder scaffolding invented to make
the design system visible before real content existed. It is not biographical
fact — when the real resume/project/work history is provided, replace it
wholesale rather than treating it as a starting draft to lightly edit.
