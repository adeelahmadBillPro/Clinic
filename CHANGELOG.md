# CHANGELOG — ClinicOS Security & Correctness Remediation

Comprehensive pass through the 65-finding fix plan. Organised by priority
tier. Each bullet references the source file(s) changed; open the file
and look for a comment starting with `P1-`, `P2-`, `P3-`, or `P4-` to
find the exact diff (server-side changes also leave a one-line comment
explaining the reason for the change, per the plan instructions).

---

## PRIORITY 1 — CRITICAL

1. **Stripe webhook unsigned-event fallback** — removed the "dev
   fallback" that accepted unsigned webhooks when `STRIPE_WEBHOOK_SECRET`
   or the signature header was missing. Hard-fails with 400 now.
   `src/app/api/webhooks/stripe/route.ts`.

2. **Role checks on authenticated API routes** — new shared guard at
   `src/lib/api-guards.ts` (`requireApiRole([...])`). Applied to
   stripe/checkout, stripe/portal, upgrade-request, consultations,
   pharmacy/dispense, billing + `[id]`, inventory (medicines, suppliers,
   purchase-orders, receive, cancel), IPD (beds, admissions, discharge,
   nursing-notes), lab/orders + `[id]`, appointments + `[id]`,
   cash-shifts + open. 403 shape `{ success: false, error: "<role> cannot
   perform this action" }`.

3. **Tenant FK validation on write paths** — verify `doctorId`,
   `patientId`, `bedId`, `admissionId`, `consultationId`, and
   `medicines[].medicineId` live in the caller's clinic before inserting.
   `src/app/api/appointments/route.ts`,
   `src/app/api/appointments/[id]/route.ts`,
   `src/app/api/ipd/admissions/route.ts`,
   `src/app/api/lab/orders/route.ts`,
   `src/app/api/consultations/route.ts`.

4. **Monotonic counter races** — new `Counter` Prisma model +
   `src/lib/counter.ts#nextSequence`, atomic `upsert + increment`.
   Rewrote `nextMrn`, `nextTokenNumber`, bill / PO / lab / admission /
   pharmacy-order number generation to use it. Partial unique index on
   `Appointment (clinicId, doctorId, day, timeSlot)` for live statuses
   via raw migration. Appointment POST + book/[slug] POST catch P2002 →
   409. See
   `prisma/migrations/manual-20260423-counter-and-appointment-slot/migration.sql`.

5. **Avatar upload → Cloudinary** — new `src/lib/cloudinary.ts` with
   magic-byte sniffing (`0x89504E47` PNG, `0xFFD8FF` JPEG, `RIFF…WEBP`).
   `src/app/api/upload/avatar/route.ts` rewritten to stream to Cloudinary
   with per-clinic folder scoping. Deleted
   `src/app/api/files/avatars/[name]/route.ts`. `.env.example` documents
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

6. **Cross-tenant medicine stock write** —
   `src/app/api/inventory/purchase-orders/[id]/receive/route.ts` now uses
   `medicine.updateMany { id, clinicId }`, validates submitted medicineIds
   against the PO's original items, and caps `receivedQty` at ordered qty.

7. **Purchase-order receive idempotency** — same file, CAS on
   `purchaseOrder.updateMany { status: { in: ['DRAFT','ORDERED'] } }`
   before running stock increments. 409 on re-receive.

8. **Open redirect on login** — `src/components/auth/LoginForm.tsx`
   `safeCallbackUrl()` rejects non-`/` prefix and scheme-relative
   (`//evil.com`, `/\evil.com`).

9. **Stripe `current_period_end` path** — reads from
   `sub.items.data[0]?.current_period_end` (Stripe API 2024-10+), throws
   when missing (no silent `Date.now()` fallback).
   `src/app/api/webhooks/stripe/route.ts`. New reconciliation tool at
   `scripts/reconcile-stripe-subs.ts` (dry-run default, `--apply` to
   persist).

10. **Security headers** — `next.config.mjs`: `poweredByHeader: false`,
    X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy,
    Permissions-Policy, HSTS, CSP-Report-Only (allows Stripe + Cloudinary
    origins).

---

## PRIORITY 2 — HIGH

11. **Stock oversell on dispense** — conditional
    `medicine.updateMany { id, clinicId, stockQty: { gte: qty } }` inside
    the dispense transaction. 409 with per-medicine error.
    `src/app/api/pharmacy/orders/[id]/dispense/route.ts`.

12. **Review abuse + moderation** —
    `src/app/api/reviews/route.ts` now requires the appointment to be
    `COMPLETED`, runs behind a 3-per-IP-per-hour rate limit, and creates
    reviews with `isPublished: false`. New admin endpoints
    `src/app/api/reviews/[id]/publish/route.ts` and `.../reject/route.ts`
    (OWNER/ADMIN only). Schema default on `Review.isPublished` flipped
    to `false`. Shared rate-limiter at `src/lib/rate-limit.ts`.

13. **Public booking abuse** — `src/app/api/book/[slug]/route.ts`
    5-per-IP-per-hour limit keyed on slug+IP; `notes` stripped of
    control characters and capped at 500.

14. **Registration abuse + email verification** —
    `src/app/api/register/route.ts` rate-limited, catches P2002 on email
    unique. Users are now created with `isActive: false` +
    `emailVerifyTokenHash` (SHA-256 of a 32-byte token). New
    `/api/verify-email/route.ts` flips the flag atomically. `auth.ts`
    rejects login when `emailVerifiedAt` is null.

15. **Raw `prisma.*` writes in route handlers** — `patients/[id]`,
    `profile`, `profile/schedule` now use `updateMany` with explicit
    `clinicId` (and `userId` where relevant) predicates.

16. **Prisma FK relations + cascade** — added
    `clinic @relation(…, onDelete: Cascade)` to all 23 tenant models +
    reverse arrays on `Clinic`. Simplified
    `src/app/api/admin/clinics/[id]/route.ts` DELETE from 24 manual
    `deleteMany`s down to `user.deleteMany + clinic.delete`; old hand
    cascade retained commented out with a 2026-05-07 removal flag.
    Migration SQL:
    `prisma/migrations/manual-20260423-fk-relations/migration.sql`.

17. **CSV injection** —
    `src/app/api/settings/export/route.ts` prefixes cells starting with
    `=`, `+`, `-`, `@`, `\t`, `\r` with a single quote; rejects exports
    over 10k rows with 413.

18. **Email template XSS** — `src/lib/email.ts` HTML-escapes owner-
    controlled `clinicName` before interpolation. New
    `verifyEmailTemplate`.

19. **Bill discount + insurance semantics** —
    `src/app/api/billing/route.ts` clamps `discount` to `[0, subtotal]`;
    documented that `insuranceInfo` is metadata-only and does not
    affect the balance.

20. **Vitals / BMI bounds** — `src/lib/validations/consultation.ts`
    pulse 30–250, temp 30–45°C, weight 0.5–500kg, height 30–260cm, spO₂
    50–100%, blood sugar 20–800, BP `NNN/NN`. `consultations` route
    guards BMI divide-by-near-zero for height <50cm.

21. **Middleware `endsWith` tightening** — `src/middleware.ts` now uses
    anchored regex for `/api/doctors/<id>/reviews` and `/slots`.

22. **Forgot-password timing enumeration** —
    `src/app/api/forgot-password/route.ts` moves all work to
    `runAfterResponse` (shim in `src/lib/background.ts` since Next 14.2
    doesn't yet have `after()`). Response time is constant.

23. **Session invalidation on deactivation** — `auth.ts` jwt callback
    re-reads `User.isActive` + `emailVerifiedAt` on every refresh;
    returns `null` to revoke when either flips to bad state.

24. **Email uniqueness policy documented** — kept global unique as the
    default; added a header comment on `User` in `prisma/schema.prisma`
    explaining the tradeoff.

25. **Fire-and-forget IIFE → `runAfterResponse`** —
    `src/app/api/tokens/[id]/route.ts` WhatsApp notification now uses
    the background shim.

26. **Upgrade-request approval race** —
    `src/app/api/admin/upgrade-requests/[id]/route.ts` CAS on
    `status: "PENDING"` before extending the subscription. 409 on
    already-reviewed.

27. **Bcrypt rounds consistency** — `src/app/api/profile/route.ts` PUT
    and `scripts/seed-super-admin.ts` now use `hashPassword` /
    `verifyPassword` from `src/lib/password.ts` (rounds = 12 uniformly).

28. **`photoUrl` Cloudinary regex** — `src/lib/validations/profile.ts`
    rejects anything that doesn't match
    `^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/`.

29. **Payment collection race** —
    `src/app/api/billing/[id]/route.ts` atomic increment with
    `paidAmount: { lt: total }` predicate; explicit 400 on overpayment
    (no more silent `Math.min`).

30. **Patient activity OOM + PHI** —
    `src/app/api/patients/[id]/activity/route.ts` cursor-paginated
    (`?before=&limit=`, cap 200); PHI (consultations, prescriptions,
    lab orders) redacted for non-clinical roles (RECEPTIONIST,
    PHARMACIST, LAB_TECH); audit action formatter no longer crashes on
    leading underscores.

31. **IPD bed occupancy race** —
    `src/app/api/ipd/admissions/route.ts` CAS on
    `bed.updateMany { isOccupied: false }` inside the tx before creating
    the admission. 409 on race.

32. **IPD re-discharge** —
    `src/app/api/ipd/admissions/[id]/discharge/route.ts` CAS on
    `status: "ADMITTED"` before creating the bill / freeing the bed.

---

## PRIORITY 3 — MEDIUM

33. **Bill.doctorId FK + stats rewrite** — added nullable
    `Bill.doctorId` + `@@index([clinicId, doctorId])`. Populated in
    tokens, patients (auto-token), pharmacy dispense (prescribing
    doctor), IPD discharge (admitting doctor). Stats routes
    (`src/app/api/stats/team-today/route.ts`,
    `src/app/api/stats/my-day/route.ts`) now filter by `doctorId`
    instead of bill-item description substring.

34. **Settings validation + audit** —
    `src/app/api/settings/clinic/route.ts` validates IANA timezone via
    `Intl.DateTimeFormat`, HH:MM regex on `tokenResetTime`, writes an
    audit log.

35. **Non-ASCII name regex** — `src/lib/validations/common.ts`
    `/^[\p{L}\p{M}.\-'’ ]+$/u` (accepts Arabic / Urdu / Hindi / accented
    European). Added `target: "ES2020"` to `tsconfig.json` so the `u`
    flag compiles.

36. **Doctor slots clinic timezone** —
    `src/app/api/doctors/[id]/slots/route.ts` computes weekday and "is
    past" in the clinic's IANA timezone using native
    `Intl.DateTimeFormat` (no new dep).

37. **CashShift unique constraint** — `@@unique([clinicId, userId,
    shiftDate, shiftType])`. Migration guards against existing duplicate
    rows before adding.

38. **Twilio phone normalization** — `src/lib/twilio.ts`
    `sendWhatsApp(to, body, countryCode?)` + `sendSms(to, body, countryCode?)`
    default to "92" for back-compat; leading `0` is only treated as PK
    trunk when countryCode is 92.

39. **Doctors list N+1** — `src/app/api/doctors/route.ts` single
    `token.groupBy` instead of per-doctor `count` loop.

40. **Token state machine** — `src/app/api/tokens/[id]/route.ts`
    enforces explicit transition matrix; 409 on illegal transition (e.g.
    COMPLETED → WAITING).

41. **WhatsApp opt-out** — `Patient.optOutWhatsApp` field; respected in
    `tokens/[id]` notifier; exposed on `patients/[id]` PATCH. Outbound
    message templates include "Reply STOP to unsubscribe." tail.

42. **Medicine stock role gate** — already satisfied by P1-2 (`PATCH` /
    `DELETE` on `inventory/medicines/[id]` gated to
    PHARMACIST/OWNER/ADMIN).

43. **Super admin seed script hardening** —
    `scripts/seed-super-admin.ts` reads password from `SEED_PASSWORD`
    env or TTY hidden prompt (not `process.argv`); `--force-orphan` flag
    required to strip OWNER role from a clinic owner.

44. **`requireRole()` on every dashboard page.tsx** — 24 pages now use
    the `requireRole(["..."], "/path")` helper. `requireRole` narrowed
    to return `RoleGatedSession` so `session.user.clinicId: string`
    downstream. Helper file: `src/lib/require-role.ts`. Pages kept open
    to any authenticated user: `dashboard`, `profile`, `help`.

45. **PHI in WhatsApp URLs → clipboard** — new
    `whatsappLinkForPhone(phone)` + `buildTokenSlipText(slip)` in
    `src/lib/whatsapp.ts`; callers copy message to clipboard before
    opening wa.me with phone only. Updated
    `src/components/reception/TokenSlipDialog.tsx` and
    `src/components/billing/BillDetail.tsx`. Old
    `whatsappLinkForSlip` marked `@deprecated`.

46. **RxTemplates localStorage → DB** — new `PrescriptionTemplate` model,
    `/api/prescriptions/templates` GET/POST + `/[id]` DELETE
    (DOCTOR/OWNER/ADMIN only). `src/components/doctor/RxTemplatesMenu.tsx`
    rewritten to fetch from the API.

---

## PRIORITY 4 — LOW / HYGIENE

47. **Visibility-aware polling** — new `src/lib/hooks/usePolling.ts`;
    applied to `TokenBoard`, `DoctorDesk`, `PharmacyQueue`, `LabQueue`,
    `NotificationBell`, `DisplayBoard` (4s data poll only; 1s clock
    intentionally unchanged), `MyDayCard`, `TeamPerformanceTable`,
    `ReceptionScreen`. Polling pauses while the tab is hidden.

48. **AbortController on debounced searches** —
    `BillingList`, `PatientSearch`, `PatientsClient`, `PrescriptionBuilder`.
    Stale responses no longer overwrite fresh results.

49. **`rel="noopener noreferrer"`** — fixed on
    `appointments/page.tsx`, `SettingsPanel.tsx`,
    `PurchaseOrdersClient.tsx` (others already had it).

50. **Dead `rememberMe` checkbox** — removed from
    `src/components/auth/LoginForm.tsx` and `loginSchema`.

51. **T&C checkbox on register** — required checkbox in
    `src/components/auth/RegisterForm.tsx`, backed by
    `registerSchema.acceptTerms.refine`. `User.acceptedTermsAt` field.
    New stub pages `src/app/terms/page.tsx` and
    `src/app/privacy/page.tsx`.

52. Covered by #17 (CSV injection).

53. **`.env.example` + `.gitignore`** — `.env.example` already
    committed in P1-5. `.gitignore` simplified to `.env*` +
    `!.env.example`.

54. **AuditLog.ipAddress** — `getIp(req)` helper in `src/lib/utils.ts`;
    populated on every `auditLog.create` across 20 route handlers (24
    call sites).

55. **`typecheck` npm script** — `package.json`
    `"typecheck": "tsc --noEmit"`.

56. **ESLint during builds** — `next.config.mjs`
    `eslint.ignoreDuringBuilds: false`. Cleared ~25 pre-existing
    unused-import / prefer-const errors across the components.

57. **Server-side PDF rendering** — new
    `src/lib/pdf/BillPdf.tsx` and `src/lib/pdf/PrescriptionPdf.tsx`
    (using `@react-pdf/renderer`). New endpoints
    `src/app/api/bills/[id]/pdf/route.tsx` and
    `src/app/api/prescriptions/[id]/pdf/route.tsx` stream A4 PDFs.
    `BillDetail.tsx` + `PrescriptionPrintView.tsx` now fetch + download
    from these endpoints. Deleted `src/lib/download-pdf.ts`; removed
    `html2pdf.js` from `package.json`.

58. **Unauth handling on pages** — already covered by P3-44
    (`requireRole` redirects to `/login?callbackUrl=...`).

59. **Audit log pagination + filters** —
    `src/app/(dashboard)/settings/audit-log/page.tsx` server-side
    pagination (`?page=&action=&userId=`) with 50-row pages.
    `AuditLogTable` drops the 60s client refetch; keeps a quick
    in-page fuzzy filter.

---

## Migrations under `prisma/migrations/`

| File | What it does | Safe on production data? |
|---|---|---|
| `manual-20260423-counter-and-appointment-slot/migration.sql` | Creates `Counter` table, seeds current year's max values for MRN / BILL / PO / LAB / ADM / PH, adds partial unique index on `Appointment` for live-status slots. | Yes, seeding uses `GREATEST(...)` so re-running is idempotent. |
| `manual-20260423-fk-relations/migration.sql` | Adds `FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id) ON DELETE CASCADE` on 24 tenant tables. | Yes for clean data; fails loudly if any orphan `clinicId` exists (the migration asserts first). Operator must fix orphans before re-running. |
| `manual-20260424-p3-schema/migration.sql` | `Bill.doctorId` (nullable), `Patient.optOutWhatsApp` (default false), `CashShift` unique on `(clinicId, userId, shiftDate, shiftType)`, new `PrescriptionTemplate` table, `User.emailVerifiedAt` / `emailVerifyTokenHash` / `acceptedTermsAt`. | Yes. Unique constraint aborts cleanly if existing duplicate cash shifts — dedupe first. |

**Do these in order** (Counter first, then FK relations, then P3
schema). Each is wrapped in `BEGIN; ... COMMIT;` so a failure rolls back
cleanly.

---

## Known not fixed / deferred

- **`next/server.after()`** — this Next 14.2 codebase doesn't have it.
  The P2-22 and P2-25 fixes use `src/lib/background.ts#runAfterResponse`
  (a `setImmediate`-based shim). On a persistent Node server this is
  equivalent; on true serverless (Vercel/Lambda) the work may be killed
  mid-flight once the response is sent. Upgrade path: bump Next to 15
  and swap `runAfterResponse` for `after()`.
- **Rate limiting is process-local** — `src/lib/rate-limit.ts` holds
  buckets in an in-process `Map`. Covers casual abuse; misses
  coordinated attacks across instances. `TODO` note in the file points
  at Upstash / Redis.
- **WhatsApp STOP webhook** — P3-41 added the opt-out flag but currently
  it flips only via manual toggle in the patient edit UI. A Twilio
  inbound webhook to auto-flip on "STOP" is not wired up.
- **Socket.io replacement of polling** — deferred (P4-47 comment left
  `TODO: replace with socket.io`). The polling-with-visibility fix buys
  most of the CPU savings for now.
- **Existing localStorage prescription templates** — P3-46 switches
  storage to DB, but there's no migration for templates that already
  live in users' browsers. Note shown in the RxTemplates empty state.
- **Prior avatars pointing at `/api/files/avatars/*`** — that route was
  deleted in P1-5. Any `User.photoUrl` / `Doctor.photoUrl` still
  pointing at the old path will 404; users need to re-upload via the
  Cloudinary flow. In practice only dev data was affected.

---

## Validation

All three gates green at the end of the run:

- `npm run lint` → `✔ No ESLint warnings or errors`
- `npx tsc --noEmit` → no output (0 errors)
- `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`
- `npm run build` → passes with `eslint.ignoreDuringBuilds: false` flipped on
