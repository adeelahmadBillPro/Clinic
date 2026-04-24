-- Manual migration: run with `psql $DATABASE_URL -f migration.sql` (or paste
-- into a Prisma migration folder under a real migration name after reviewing).
-- The app is running `prisma migrate` only on request, so this file captures
-- the DDL added under P1-4 (counter-based sequence numbers) and the partial
-- unique index that closes the appointment slot race.

BEGIN;

-- ─── Counter: atomic (clinic, kind, year) sequence ──────────────────────────
CREATE TABLE IF NOT EXISTS "Counter" (
  "id"        TEXT PRIMARY KEY,
  "clinicId"  TEXT    NOT NULL,
  "kind"      TEXT    NOT NULL,
  "year"      INTEGER NOT NULL,
  "value"     INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Counter_clinicId_kind_year_key"
  ON "Counter" ("clinicId", "kind", "year");

CREATE INDEX IF NOT EXISTS "Counter_clinicId_idx"
  ON "Counter" ("clinicId");

-- ─── Seed counter values from existing max sequences ────────────────────────
-- Without this, the first BL- / PO- / LAB- / ADM- / MRN- issued after the
-- migration would restart at 1 and collide with historical numbers.
-- Each statement is best-effort; the extract() casts rely on the numeric
-- suffix being well-formed (true for every value written by the previous
-- generator).
INSERT INTO "Counter" ("id", "clinicId", "kind", "year", "value", "updatedAt")
SELECT gen_random_uuid()::text, p."clinicId", 'MRN',
       EXTRACT(YEAR FROM NOW())::int,
       MAX(CAST(SUBSTRING(p."mrn" FROM '(\d+)$') AS INTEGER)),
       NOW()
FROM "Patient" p
WHERE p."mrn" LIKE 'MRN-' || EXTRACT(YEAR FROM NOW())::text || '-%'
GROUP BY p."clinicId"
ON CONFLICT ("clinicId", "kind", "year") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

INSERT INTO "Counter" ("id", "clinicId", "kind", "year", "value", "updatedAt")
SELECT gen_random_uuid()::text, b."clinicId", 'BILL',
       EXTRACT(YEAR FROM NOW())::int,
       MAX(CAST(SUBSTRING(b."billNumber" FROM '(\d+)$') AS INTEGER)),
       NOW()
FROM "Bill" b
WHERE b."billNumber" LIKE 'BL-' || EXTRACT(YEAR FROM NOW())::text || '-%'
GROUP BY b."clinicId"
ON CONFLICT ("clinicId", "kind", "year") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

INSERT INTO "Counter" ("id", "clinicId", "kind", "year", "value", "updatedAt")
SELECT gen_random_uuid()::text, po."clinicId", 'PO',
       EXTRACT(YEAR FROM NOW())::int,
       MAX(CAST(SUBSTRING(po."poNumber" FROM '(\d+)$') AS INTEGER)),
       NOW()
FROM "PurchaseOrder" po
WHERE po."poNumber" LIKE 'PO-' || EXTRACT(YEAR FROM NOW())::text || '-%'
GROUP BY po."clinicId"
ON CONFLICT ("clinicId", "kind", "year") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

INSERT INTO "Counter" ("id", "clinicId", "kind", "year", "value", "updatedAt")
SELECT gen_random_uuid()::text, l."clinicId", 'LAB',
       EXTRACT(YEAR FROM NOW())::int,
       MAX(CAST(SUBSTRING(l."orderNumber" FROM '(\d+)$') AS INTEGER)),
       NOW()
FROM "LabOrder" l
WHERE l."orderNumber" LIKE 'LAB-' || EXTRACT(YEAR FROM NOW())::text || '-%'
GROUP BY l."clinicId"
ON CONFLICT ("clinicId", "kind", "year") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

INSERT INTO "Counter" ("id", "clinicId", "kind", "year", "value", "updatedAt")
SELECT gen_random_uuid()::text, a."clinicId", 'ADM',
       EXTRACT(YEAR FROM NOW())::int,
       MAX(CAST(SUBSTRING(a."admissionNumber" FROM '(\d+)$') AS INTEGER)),
       NOW()
FROM "IpdAdmission" a
WHERE a."admissionNumber" LIKE 'ADM-' || EXTRACT(YEAR FROM NOW())::text || '-%'
GROUP BY a."clinicId"
ON CONFLICT ("clinicId", "kind", "year") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

INSERT INTO "Counter" ("id", "clinicId", "kind", "year", "value", "updatedAt")
SELECT gen_random_uuid()::text, o."clinicId", 'PH',
       EXTRACT(YEAR FROM NOW())::int,
       MAX(CAST(SUBSTRING(o."orderNumber" FROM '(\d+)$') AS INTEGER)),
       NOW()
FROM "PharmacyOrder" o
WHERE o."orderNumber" LIKE 'PH-' || EXTRACT(YEAR FROM NOW())::text || '-%'
GROUP BY o."clinicId"
ON CONFLICT ("clinicId", "kind", "year") DO UPDATE
  SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

-- Token counters are per-(doctor, day); we do not backfill because a new
-- day's counter naturally starts at 1 and tokens are short-lived.

-- ─── Appointment: partial unique index to close slot race ───────────────────
-- The API already checks for a clash before inserting, but two concurrent
-- requests can both see "no clash" and both insert. A unique index that
-- only considers live statuses gives the database the final say.
-- `(date_trunc('day', "appointmentDate"))` keeps same-slot-same-day
-- bookings distinct across different days.
CREATE UNIQUE INDEX IF NOT EXISTS
  "Appointment_doctor_day_slot_live_uniq"
  ON "Appointment" (
    "clinicId",
    "doctorId",
    (date_trunc('day', "appointmentDate")),
    "timeSlot"
  )
  WHERE "status" IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN');

COMMIT;
