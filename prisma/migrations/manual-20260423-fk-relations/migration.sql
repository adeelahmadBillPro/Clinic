-- Manual migration: add Clinic-scoped foreign keys with ON DELETE CASCADE
-- to every tenant model. Ships alongside the schema change in P2-16.
--
-- Run after reviewing: `psql $DATABASE_URL -f migration.sql`.
--
-- Idempotent: uses `IF NOT EXISTS` on the constraint names (Postgres 15+
-- supports this for ALTER TABLE ADD CONSTRAINT through DO blocks). Each
-- block also checks for orphan rows before adding the FK so a bad row
-- doesn't nuke the migration half-way through.

BEGIN;

-- Helper: raise a clear error if there are any orphan rows referencing a
-- now-deleted Clinic. Operator must clean those up before re-running.
CREATE OR REPLACE FUNCTION _assert_no_orphans(child_table text)
RETURNS void AS $$
DECLARE
  orphan_count bigint;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM %I c LEFT JOIN "Clinic" p ON c."clinicId" = p."id" WHERE p."id" IS NULL',
    child_table
  ) INTO orphan_count;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Cannot add FK on %: % orphan rows reference a missing Clinic. Clean those up first.',
      child_table, orphan_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Each block: assert no orphans, then add the FK if it doesn't already exist.
DO $$
DECLARE
  tables text[] := ARRAY[
    'Patient', 'Doctor', 'Token', 'Appointment', 'Consultation',
    'VitalSigns', 'Prescription', 'Medicine', 'PharmacyOrder', 'Supplier',
    'PurchaseOrder', 'StockMovement', 'Bed', 'IpdAdmission',
    'NursingNote', 'LabOrder', 'Bill', 'CashShift', 'AuditLog',
    'Notification', 'Review', 'UpgradeRequest', 'Subscription', 'Counter'
  ];
  t text;
  constraint_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    PERFORM _assert_no_orphans(t);
    constraint_name := t || '_clinicId_fkey';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        t, constraint_name
      );
    END IF;
  END LOOP;
END $$;

DROP FUNCTION _assert_no_orphans(text);

COMMIT;
