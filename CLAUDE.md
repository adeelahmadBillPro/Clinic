# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# dev / build / lint / typecheck
npm run dev              # Next.js dev server
npm run build            # production build (lint runs as part of build — must pass)
npm run start            # serve the built app (PM2 calls this in prod)
npm run lint             # next lint
npm run typecheck        # tsc --noEmit (run before committing — strict mode is on)

# database (Prisma 6 + Postgres)
npm run db:push          # push schema.prisma to DB without a migration (dev iteration)
npm run db:generate      # regenerate Prisma client after schema edits
npm run db:seed          # tsx prisma/seed.ts — seeds plans + demo data
npm run db:studio        # Prisma Studio GUI

# one-off scripts
tsx scripts/seed-super-admin.ts        # promote/seed the platform super admin
tsx scripts/reconcile-stripe-subs.ts   # reconcile Subscription rows against Stripe
```

There is no automated test suite in this repo — verify changes with `npm run typecheck`, `npm run build`, and manual smoke testing in `npm run dev`.

## Architecture

### Stack

Next.js 14.2 App Router · React 18 · TypeScript (strict) · Prisma 6 · PostgreSQL · NextAuth v5 (beta) · Tailwind v3.4 + shadcn/ui · Framer Motion · Zod · Stripe · Cloudinary · Resend · Twilio (WhatsApp) · @simplewebauthn (v9). Path alias `@/*` → `./src/*`.

### Multi-tenant isolation

This is a multi-tenant SaaS — every clinic's data lives in the same database, isolated by `clinicId` on each row. The two non-negotiable rules:

1. **Tenant-scoped models must be queried via `db(clinicId)` from [src/lib/tenant-db.ts](src/lib/tenant-db.ts).** It returns a Prisma `$extends` proxy that auto-injects `clinicId` into every read `where`, write `where`, `create.data`, and `upsert.create`. The list of tenant models lives in `TENANT_MODELS` in that file — if you add a new tenant-scoped Prisma model, add it there too.
2. **Never use the raw `prisma` import for tenant data.** Raw `prisma` is reserved for `User`, `Clinic`, `Plan`, `Subscription`, `Passkey`, and other public-schema rows. Using raw `prisma` on `patient`/`appointment`/etc. bypasses tenant scoping and is a cross-tenant data leak.
3. **API routes** must additionally validate that any incoming foreign keys (doctorId, patientId, bedId, etc.) live in the caller's clinic before inserting — see CHANGELOG P1-3 for the pattern.

### Auth (NextAuth v5, split config)

- [src/auth.config.ts](src/auth.config.ts) — edge-safe config consumed by `middleware.ts`. No DB calls. Augments NextAuth's `Session`/`User`/`JWT` types to carry `id`, `role`, `clinicId`.
- [src/auth.ts](src/auth.ts) — Node runtime. Has the real `Credentials` providers and the heavy jwt callback that re-reads the User row on every refresh so deactivation/role changes take effect without waiting for JWT expiry.
  - Two providers: default email+password, and `id: "passkey"` for WebAuthn.
  - `AuthError` extends `CredentialsSignin` so the client gets specific `code` values (`EMAIL_NOT_VERIFIED`, `LOCKED`, `INVALID_CREDENTIALS`, …) rather than the generic `credentials`.
  - Account lockout: 5 failed attempts → 15 min lock. Password column is `User.password` (not `passwordHash`).
- [src/middleware.ts](src/middleware.ts) — gates non-public paths, redirects authed users away from /login, enforces strict role gates (SUPER_ADMIN ↔ /admin only; tenant roles never see /admin). The `PUBLIC_PATHS` set + `isPublic()` regex list is the source of truth for unauthenticated routes — edit there when adding new public endpoints (e.g. passkey `auth/begin`, public booking, public review pages).
- API routes use [src/lib/api-guards.ts](src/lib/api-guards.ts) — `requireApiRole([...])` for tenant-scoped routes, `requireApiRoleAllowPlatform([...])` for routes that SUPER_ADMIN may also hit. Both return either a `Session` or a pre-built 401/403 `NextResponse` you should early-return.

### Roles & navigation

Roles (Prisma `Role` enum): `SUPER_ADMIN`, `OWNER`, `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE`, `PHARMACIST`, `LAB_TECH`. SUPER_ADMIN has no `clinicId` and lives entirely under `/admin` — they should never reach a tenant dashboard.

[src/lib/permissions.ts](src/lib/permissions.ts) is the single source of truth for:
- `NAV` — the sidebar definition (label, href, icon, allowed roles, optional `module` flag for plan-gated features)
- `bottomBarForRole(role)` — the 4-item mobile bottom bar
- `navForRole(role, enabledModules)` — filters NAV by role + the per-clinic module toggles in `clinic.settings.modules`
- `ROLE_HOME` (in `auth.ts`) — login redirect target per role

When changing role access, update permissions.ts; do NOT scatter `if (role === 'X')` checks across components.

### Plan / module gating

[src/lib/plan.ts](src/lib/plan.ts) — `getClinicAccess(clinicId)` returns `{ planFeatures, onTrial, subscriptionStatus, … }`. During trial, `canAccess()` returns true for everything (prompt mode). After trial, features fall back to the plan's flags. NAV items with a `module` key get hidden when that module is disabled in `clinic.settings.modules`.

### Route groups

- `(auth)` — login / register / forgot-password / reset-password (uses its own minimal layout)
- `(dashboard)` — every tenant role's app shell (sidebar + topbar + mobile bottom nav + install prompt). Children include `/dashboard`, `/doctor`, `/reception`, `/pharmacy`, `/ipd`, `/lab`, `/patients`, `/appointments`, `/billing`, `/inventory`, `/analytics`, `/staff`, `/settings`, `/subscription`, `/profile`, `/help`, `/tokens`, `/prescriptions`.
- `/admin` — SUPER_ADMIN only (clinics, upgrade requests, platform overview)
- Public top-level: `/book/[slug]` (clinic booking), `/review/[token]`, `/display/[clinicId]` (waiting-room queue display), `/terms`, `/privacy`, `/verify-email`

### WebAuthn (passkey login)

- [src/lib/webauthn.ts](src/lib/webauthn.ts) — `getRpConfig()` derives `rpID` (host) and `origin` from `NEXTAUTH_URL`; in-memory challenge store with 5-min TTL. **Single-instance only** — for multi-node deploy, swap to Redis.
- API routes: `/api/passkeys/register/begin|finish` (auth required), `/api/passkeys/auth/begin` (public — must be in `isPublic()` middleware list), assertion verification happens in the `passkey` Credentials provider in [src/auth.ts](src/auth.ts).
- Library is `@simplewebauthn/server` v9 — uses `authenticator: { credentialID, credentialPublicKey, counter, transports }` (NOT v10+'s `credential` shape). credentialId + publicKey are stored base64url-encoded.
- WebAuthn requires HTTPS in production (browsers refuse over HTTP except `localhost`).

### Counters / monotonic numbering

Bills, MRNs, token numbers, PO numbers, lab order numbers, admission numbers, pharmacy order numbers all flow through `nextSequence()` in [src/lib/counter.ts](src/lib/counter.ts) — atomic `upsert + increment` against the `Counter` model. Don't roll your own `findFirst + max + 1` (race-prone).

### Rate limiting

[src/lib/rate-limit.ts](src/lib/rate-limit.ts) — process-local sliding window. `LIMITS` has `REVIEWS_PER_HOUR`, `BOOKINGS_PER_HOUR`, `REGISTRATIONS_PER_HOUR`. **Buckets reset on PM2 restart** — useful escape hatch when testing.

### Security headers

[next.config.mjs](next.config.mjs) sets X-Frame-Options DENY, X-Content-Type-Options nosniff, Strict-Transport-Security, a Permissions-Policy, and CSP in **Report-Only** mode. Switch CSP to enforcing only after collecting reports and confirming all third-party origins (Stripe, Cloudinary, Unsplash, etc.) are allow-listed.

### Styling

Tailwind v3.4 with mapped tokens — colors are CSS variables (`oklch(...)`) defined in [src/app/globals.css](src/app/globals.css) under `:root` and `.dark`. Use semantic class names (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`) not raw color names. Global CSS also contains native-feel mobile rules (no rubber-band, no tap delay, idle no-select in PWA standalone mode).

### PWA

`src/app/manifest.ts` + static `src/app/icon.svg` + `src/app/apple-icon.svg` (Next.js convention — do not switch back to a dynamic `icon.tsx` with `@vercel/og`; it fails on Windows builds with `Invalid URL` from `fileURLToPath`). Root `viewport` export in [src/app/layout.tsx](src/app/layout.tsx) is required for mobile rendering — without it, mobile browsers render at 980px desktop width. `<InstallAppPrompt />` is mounted in the dashboard layout only.

## Conventions

- **Comments where the schema is unusual or the path is non-obvious** — see existing prisma comments and the `P1-`/`P2-`/`P3-`/`P4-` markers across files (see [CHANGELOG.md](CHANGELOG.md) for the index). Don't add ceremonial comments to obvious code.
- **Validation**: Zod schemas live in [src/lib/validations/](src/lib/validations/). Import from there; don't redefine inline.
- **Animations**: Framer Motion is the standard. Don't add `@emotion`. The user wants polished, professional motion.
- **Error responses from API routes**: `{ success: boolean, data?: …, error?: string }` shape; status codes follow the guards (401 / 403 / 409 / 422 / 500).

## Environment

Required env vars (see `.env.example` if present, else use these as the source list): `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM`. `NEXTAUTH_URL` is also what `getRpConfig()` parses for WebAuthn rpID/origin — keep it accurate per environment.
