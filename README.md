# Portfolio

Personal portfolio site for **Gaurav Raj Singh** — [www.mysuvo.com](https://www.mysuvo.com)

A "Terminal CLI" themed build: monospace type, green-on-black phosphor palette,
bracketed buttons, and terminal-window panes instead of cards. There's a working
shell on the homepage — type `help`.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

No environment variables are needed to run the site. Analytics and `/admin`
switch themselves off when unconfigured, so a fresh clone just works.

```bash
npm run build   # typecheck + static generation for every route
npm run lint    # eslint (flat config)
```

## Editing content

Site content — bio, projects, experience, skills, publications — lives in
[`src/lib/data.ts`](src/lib/data.ts). Edit that file; there's no need to touch
the page components. It's the single source of truth for the contact address
too, which the contact page, footer, shell and console easter egg all read from.

The canonical origin is a constant in [`src/lib/site.ts`](src/lib/site.ts),
hardcoded rather than derived from a hosting env var — that variable can resolve
to the `*.vercel.app` host, which would point every canonical tag and OG image at
the wrong domain and split the site's search ranking across two origins.

## Structure

| Path | What's there |
| --- | --- |
| `src/app/` | Routes. `/`, `/about`, `/projects/[slug]`, `/experience`, `/publications`, `/contact`, the policy pages, `/admin` |
| `src/components/ui/` | Hand-built primitives — `TerminalWindow`, `BracketButton`, `ProgressBar`, `PromptInput`, `Typewriter` |
| `src/components/` | Page-level and layout pieces |
| `src/lib/` | Data, shell commands, theme, analytics |

No component library. No `tailwind.config.js` — Tailwind v4 tokens live in
`@theme` inside [`src/app/globals.css`](src/app/globals.css).

## Analytics

First-party and self-hosted: no Google Analytics, no third-party script, no
vendor. Events go to a Neon Postgres database via `/api/track` and are read back
on `/admin`. Because it's all same-origin, the CSP needs no `script-src`
exemption for it — which is the main reason it's built this way rather than
bought.

Nothing is collected until a visitor accepts the consent prompt. See
[`src/lib/analytics/consent.ts`](src/lib/analytics/consent.ts) for why that's a
hard gate rather than a banner over live tracking. `/admin` is excluded from
tracking entirely, so reading the dashboard doesn't inflate the numbers on it.

The site sets **no cookies at all** — not for visitors, and not for the admin
login, which keeps its bearer token in memory so it dies on refresh and on tab
close.

`/admin` keeps an auth audit trail ([`admin-log.ts`](src/lib/analytics/admin-log.ts)):
every login attempt on it, success or failure, with time, IP, location and
device, shown as a panel in the dashboard with a warning when repeated failures
come from multiple addresses. That table is the **one place a full IP is
stored** — a daily-rotating hash would make the same attacker look new every
midnight, which defeats the point of a security log. `/privacy` calls the
exception out rather than letting "IPs are never stored" quietly not be true.

Every event passes through [`throttle.ts`](src/lib/analytics/throttle.ts):
dedupe, a per-type minimum interval, a token bucket, and a session cap. It's
there because idle clicking is noise, not data — one drag of the theme slider
used to emit an event per animation frame. `/api/track` re-checks independently
(a client throttle is unenforceable), capping events per IP per minute rather
than just requests.

> **If you add a localStorage key or a cookie, add it to
> [`src/lib/storage-inventory.ts`](src/lib/storage-inventory.ts).** Both
> `/privacy` and `/cookies` render their tables from that one file so they can't
> drift apart. A stale storage list on those pages is a false statement in a
> legal document, not a docs nit. Same goes for adding an event name to
> `src/lib/analytics/events.ts` — the "what's collected" list on `/privacy`
> needs it too, and an event name that nothing fires is its own bug (`filter`
> was listed as collected while no code sent it).

### Geo, and why it's not Vercel's

Cloudflare proxies this domain, so Vercel's edge sees a Cloudflare PoP rather
than the visitor — and Cloudflare's free plan routes a lot of Indian traffic
through Singapore. `x-vercel-ip-country` therefore reports where *Cloudflare*
is. `getGeo` uses `cf-ipcountry` (computed from the real visitor IP) and drops
city entirely unless Cloudflare supplies it, rather than reporting the PoP's
city. Enabling **Cloudflare → Rules → Transform Rules → Managed Transforms →
"Add visitor location headers"** (free) adds real city/region.

### Setup

1. Create a free Postgres at [neon.tech](https://neon.tech) — no card, ~0.5GB,
   which is millions of events. Copy the **pooled** connection string.
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`,
   `ANALYTICS_SALT`, `ADMIN_PASSWORD` and `ADMIN_SECRET`.
3. Add the same four to the Vercel project's environment variables, scoped to
   Production, and redeploy. Env vars only apply to builds made after they're
   added.

The `events` table and its indexes are created on the first tracked event —
there's no migration step. Raw events are deleted after 90 days, which the
privacy policy promises and [`purgeOldEvents`](src/lib/analytics/db.ts)
enforces.

Both admin variables must be set or `/admin` refuses to open, and
`ANALYTICS_SALT` being unset means no IP hash is stored at all rather than an
unsalted one. Everything fails closed on purpose: a forgotten variable must
never publish visitors' analytics or downgrade a privacy guarantee.

## Policies

| Page | What it covers |
| --- | --- |
| [`/privacy`](src/app/privacy/page.tsx) | What the analytics record, why, retention, your rights |
| [`/cookies`](src/app/cookies/page.tsx) | Every storage key, split by whether it needs consent — and why there are no cookies |
| [`/terms`](src/app/terms/page.tsx) | Use of the site, and the code-vs-content license split |
| [`/security`](src/app/security/page.tsx) | Vulnerability disclosure: scope, what's promised, known tradeoffs |
| [`/accessibility`](src/app/accessibility/page.tsx) | WCAG 2.2 AA self-assessment, and where it honestly falls short |
| [`/.well-known/security.txt`](src/app/.well-known/security.txt/route.ts) | The machine-readable disclosure contact (RFC 9116) |

They cross-reference each other, so changing one usually means checking the
others.

## Security

Set in [`next.config.ts`](next.config.ts): a CSP that blocks script from every
origin but this one (plus framing, form hijacking and `<base>` injection), HSTS,
COOP/CORP, a deny-by-default `Permissions-Policy`, and `X-Robots-Tag` on
`/admin` and `/api`. No third-party script, tag manager, or ad network anywhere.

`script-src` carries `'unsafe-inline'` — a documented, deliberate tradeoff
explained at the top of `next.config.ts` and listed publicly on `/security`.
Locking it down needs a per-request nonce, which forces every page out of static
generation.

Found something? [`/security`](src/app/security/page.tsx) has the disclosure
policy. Please report privately first.

## Verifying changes

There's no test suite. `npm run build` typechecks and statically generates every
route; `npm run lint` catches the React 19 rules this codebase leans on
(`react-hooks/purity`, `set-state-in-effect`) — both are worth trusting, they've
each caught real bugs here.

For anything visual, drive the affected route in a browser. Playwright via a
throwaway script works well; the checks worth running are horizontal overflow at
360px, console errors, and — for anything touching analytics — that no request
fires before consent.

## License

The **source code** is MIT licensed — see [LICENSE](LICENSE).

The **content** — bio, project write-ups, publication abstracts, and the site's
visual design — is **not** covered by that license and remains all rights
reserved. Fork the code, not the biography. [`/terms`](src/app/terms/page.tsx)
has the long version.
