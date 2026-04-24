-- Manual migration — P3 schema additions:
--   * Bill.doctorId  (nullable)    — P3-33 revenue attribution
--   * Patient.optOutWhatsApp       — P3-41 WhatsApp compliance
--   * CashShift unique constraint  — P3-37 prevent double-submit
--   * PrescriptionTemplate table   — P3-46 server-side Rx templates
--
-- Safe on existing data: all new columns are nullable or have defaults,
-- and the unique constraint collides only with already-duplicated shift
-- rows (we assert no duplicates before adding).
--
-- Run after reviewing: `psql $DATABASE_URL -f migration.sql`.

BEGIN;

-- ─── Bill.doctorId ───────────────────────────────────────────────────────
ALTER TABLE "Bill"
  ADD COLUMN IF NOT EXISTS "doctorId" TEXT;
CREATE INDEX IF NOT EXISTS "Bill_clinicId_doctorId_idx"
  ON "Bill" ("clinicId", "doctorId");

-- ─── Patient.optOutWhatsApp ──────────────────────────────────────────────
ALTER TABLE "Patient"
  ADD COLUMN IF NOT EXISTS "optOutWhatsApp" BOOLEAN NOT NULL DEFAULT false;

-- ─── CashShift unique (clinic, user, date, type) ─────────────────────────
-- Abort if existing data already violates the uniqueness we're about to add.
DO $$
DECLARE
  dupes bigint;
BEGIN
  SELECT COUNT(*) INTO dupes FROM (
    SELECT 1 FROM "CashShift"
     GROUP BY "clinicId", "userId", "shiftDate", "shiftType"
    HAVING COUNT(*) > 1
  ) s;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Found % duplicate (clinicId,userId,shiftDate,shiftType) CashShift rows. Resolve before adding unique constraint.',
      dupes;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS
  "CashShift_clinicId_userId_shiftDate_shiftType_key"
  ON "CashShift" ("clinicId", "userId", "shiftDate", "shiftType");

-- ─── PrescriptionTemplate ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PrescriptionTemplate" (
  "id"        TEXT PRIMARY KEY,
  "clinicId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "items"     JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrescriptionTemplate_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS
  "PrescriptionTemplate_clinicId_userId_name_key"
  ON "PrescriptionTemplate" ("clinicId", "userId", "name");
CREATE INDEX IF NOT EXISTS
  "PrescriptionTemplate_clinicId_userId_idx"
  ON "PrescriptionTemplate" ("clinicId", "userId");

-- ─── User.emailVerifiedAt / emailVerifyTokenHash / acceptedTermsAt ────────
-- P2 leftovers — safe to re-run (IF NOT EXISTS guards).
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailVerifyTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptedTermsAt"      TIMESTAMP(3);

COMMIT;
