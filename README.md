# Portfolio

Personal portfolio site for **Gaurav Raj Singh**. [www.mysuvo.com](https://www.mysuvo.com)

A terminal themed build: monospace type, bracketed buttons, and terminal
window panes instead of cards. There is a working shell on the homepage.
Type `help` to see what it does.

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

No environment variables are required to run the site. Analytics and
`/admin` switch themselves off when unconfigured, so a fresh clone just
works.

```bash
npm run build   # typecheck and static generation for every route
npm run lint    # eslint, flat config
```

## Editing content

Site content (bio, projects, experience, skills, publications) lives in
[`src/lib/data.ts`](src/lib/data.ts). Edit that file directly; the page
components do not need to change. It is also the single source of truth
for the contact address, which the contact page, footer, shell, and
console easter egg all read from the same place.

The canonical origin is a constant in
[`src/lib/site.ts`](src/lib/site.ts), hardcoded rather than derived from
a hosting environment variable. That variable can resolve to the
`*.vercel.app` host, which would point every canonical tag and social
image at the wrong domain and split the site's search ranking across
two origins.

## Structure

| Path | What is there |
| --- | --- |
| `src/app/` | Routes: `/`, `/about`, `/projects/[slug]`, `/experience`, `/publications`, `/contact`, the policy pages, `/admin` |
| `src/components/ui/` | Hand built primitives: `TerminalWindow`, `BracketButton`, `ProgressBar`, `PromptInput`, `Typewriter` |
| `src/components/` | Page level and layout pieces |
| `src/lib/` | Content data, shell commands, theming, analytics, social image generation |

No component library. No `tailwind.config.js`. Tailwind v4 tokens live
in an `@theme` block inside
[`src/app/globals.css`](src/app/globals.css).

## Look and feel

Two display modes, both driven by CSS custom properties set on `<html>`
before first paint, so there is no flash of the wrong theme on load.

**Retro** is the default: a color terminal with four selectable
palettes (ANSI, Synthwave, Arcade, Vaporwave), each defining the same
six accent slots so components never need to know which palette is
active. **Mono** is a single, user-pickable phosphor color driving
everything, the classic one-color terminal look.

A handful of ambient effects keep the page from feeling static: a
breathing glow on the hero text, a scanning beam under section
dividers, a soft phosphor mist in the background, and a CRT overlay
with scanlines and a corner falloff. All of it is CSS only, all of it
respects `prefers-reduced-motion`, and all of it can be turned off from
the display settings panel.

### Performance tiers

The heaviest visual effects (the phosphor mist, the CRT texture) are
built to be cheap by default, but low end devices vary. A small
performance guard measures actual frame timing after load and
downgrades automatically if the device is struggling, without any
input from the visitor. The display panel also exposes a manual
override (auto, full, or lite) for anyone who wants to force one mode.

## Social previews and icons

Favicons, the Apple touch icon, and Open Graph and Twitter share cards
are all generated at build time from code, not from checked-in image
files. This means they can never drift out of sync with the site's
actual color palette the way a hand exported PNG would.

- [`src/lib/og-theme.ts`](src/lib/og-theme.ts) holds the colors used in
  generated images, matched to the default retro palette.
- [`src/lib/og-mark.tsx`](src/lib/og-mark.tsx) draws the site mark (a
  terminal chevron and cursor) used in every favicon size.
- [`src/lib/og-crt.tsx`](src/lib/og-crt.tsx) draws the shared CRT
  texture (glow, scanlines, corner falloff) used on every share card.
- [`src/lib/page-cards.ts`](src/lib/page-cards.ts) is a registry of
  per page title, description, and accent color, used to build a
  distinct share card for every page rather than one generic image
  for the whole site.

Every route that can reasonably be shared, the homepage, each project,
and every policy page, has its own card. Policy pages are marked
clearly as policy documents on their card so a legal page and a
project page never look interchangeable in a link preview.

To see every generated image in one place, run the site locally and
open [`brand-preview/index.html`](brand-preview/index.html) in a
browser. It shows each favicon at true size next to mock browser tabs,
plus every share card at both full size and at the smaller widths a
feed or chat app actually renders them at.

```bash
npm run build
npx next start -p 3111
node brand-preview/render.mjs
```

The rendered PNGs in that folder are gitignored; only the viewer and
its render script are tracked, since the images themselves are just
build output.

## Analytics

First party and self hosted. No Google Analytics, no third party
script, no vendor. Events go to a Neon Postgres database through
`/api/track` and are read back on `/admin`. Because everything is same
origin, the Content Security Policy needs no `script-src` exemption for
it, which is the main reason this is built rather than bought.

Nothing is collected until a visitor accepts the consent prompt. See
[`src/lib/analytics/consent.ts`](src/lib/analytics/consent.ts) for why
that is a hard gate rather than a banner shown over live tracking.
`/admin` is excluded from tracking entirely, so reading the dashboard
does not inflate the numbers on it.

The site sets **no cookies at all**, not for visitors and not for the
admin login, which keeps its bearer token in memory only so it dies on
refresh and on tab close.

`/admin` keeps an auth audit trail
([`admin-log.ts`](src/lib/analytics/admin-log.ts)) of every login
attempt on it, success or failure, with time, IP, location, and device,
shown as a panel in the dashboard with a warning when repeated failures
come from multiple addresses. That table is the one place a full IP is
stored. A daily rotating hash would make the same attacker look new
every midnight, which defeats the point of a security log.
`/privacy` calls out the exception explicitly rather than letting "IPs
are never stored" quietly stop being true.

Every event passes through
[`throttle.ts`](src/lib/analytics/throttle.ts): deduplication, a per
type minimum interval, a token bucket, and a session cap. This exists
because idle interaction is noise, not data. One drag of the theme
slider used to emit an event per animation frame. `/api/track`
re-checks independently, since a client side throttle is not
enforceable, capping events per IP per minute rather than just
requests.

> **If you add a localStorage key or a cookie, add it to
> [`src/lib/storage-inventory.ts`](src/lib/storage-inventory.ts).**
> Both `/privacy` and `/cookies` render their tables from that one
> file so the two pages cannot drift apart. A stale storage list on
> those pages is a false statement in a legal document, not a
> documentation nit. The same applies to adding an event name to
> `src/lib/analytics/events.ts`: the "what is collected" list on
> `/privacy` needs it too.

### Geo, and why it is not Vercel's

Cloudflare proxies this domain, so Vercel's edge sees a Cloudflare
point of presence rather than the visitor, and Cloudflare's free plan
routes a lot of Indian traffic through Singapore. `x-vercel-ip-country`
therefore reports where Cloudflare is, not where the visitor is.
`getGeo` uses `cf-ipcountry` instead, which is computed from the real
visitor IP, and drops city information entirely unless Cloudflare
supplies it, rather than reporting the proxy's city by mistake.
Enabling Cloudflare's Rules, Transform Rules, Managed Transforms, "Add
visitor location headers" (free) adds real city and region data.

### Setup

1. Create a free Postgres database at [neon.tech](https://neon.tech).
   No card required, and the free tier covers roughly half a gigabyte,
   which is millions of events. Copy the pooled connection string.
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`,
   `ANALYTICS_SALT`, `ADMIN_PASSWORD`, and `ADMIN_SECRET`.
3. Add the same four variables to the Vercel project's environment
   settings, scoped to Production, and redeploy. Environment variables
   only apply to builds made after they are added.

The `events` table and its indexes are created on the first tracked
event. There is no migration step. Raw events are deleted after 90
days, which the privacy policy promises and
[`purgeOldEvents`](src/lib/analytics/db.ts) enforces.

Both admin variables must be set or `/admin` refuses to open, and an
unset `ANALYTICS_SALT` means no IP hash is stored at all rather than an
unsalted one. Everything fails closed on purpose. A forgotten
environment variable must never publish visitor analytics or weaken a
privacy guarantee.

## Policies

| Page | What it covers |
| --- | --- |
| [`/privacy`](src/app/privacy/page.tsx) | What the analytics record, why, retention, and visitor rights |
| [`/cookies`](src/app/cookies/page.tsx) | Every storage key, split by whether it needs consent, and why there are no cookies |
| [`/terms`](src/app/terms/page.tsx) | Use of the site, and the split between the code license and the content license |
| [`/security`](src/app/security/page.tsx) | Vulnerability disclosure: scope, what is promised, known tradeoffs |
| [`/accessibility`](src/app/accessibility/page.tsx) | A WCAG 2.2 AA self assessment, including where it honestly falls short |
| [`/.well-known/security.txt`](src/app/.well-known/security.txt/route.ts) | The machine readable disclosure contact, per RFC 9116 |

These pages cross reference each other, so changing one usually means
checking the others.

## Security

Configured in [`next.config.ts`](next.config.ts): a Content Security
Policy that blocks scripts from every origin but this one, plus
protections against framing, form hijacking, and `<base>` tag
injection, HSTS, COOP and CORP headers, a deny by default
`Permissions-Policy`, and `X-Robots-Tag` on `/admin` and `/api`. There
is no third party script, tag manager, or ad network anywhere on the
site.

`script-src` carries `'unsafe-inline'`, a documented and deliberate
tradeoff explained at the top of `next.config.ts` and listed publicly
on `/security`. Removing it would require a per request nonce, which
forces every page out of static generation.

Found something? [`/security`](src/app/security/page.tsx) has the
disclosure policy. Please report privately first.

## Verifying changes

There is no automated test suite. `npm run build` typechecks and
statically generates every route. `npm run lint` catches the React 19
rules this codebase relies on, including `react-hooks/purity` and
`set-state-in-effect`. Both are worth trusting; each has caught a real
bug here before.

For anything visual, run the affected route in a browser. Playwright
through a throwaway script works well. The checks worth running are
horizontal overflow at small widths, console errors, and, for anything
touching analytics, confirming that no request fires before consent is
given.

## License

The source code is MIT licensed. See [LICENSE](LICENSE).

The content (bio, project write ups, publication abstracts, and the
site's visual design) is not covered by that license and remains all
rights reserved. Fork the code, not the biography.
[`/terms`](src/app/terms/page.tsx) has the full explanation.
