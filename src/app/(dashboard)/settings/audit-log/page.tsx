import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { AuditLogTable } from "@/components/settings/AuditLogTable";
import { AuditLogFilters } from "@/components/settings/AuditLogFilters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — ClinicOS" };

const PAGE_SIZE = 50;

// Backend `entityType` strings the audit log knows about. Used to whitelist
// the entity-type filter so a malicious search param doesn't get folded
// directly into the Prisma `where`.
const KNOWN_ENTITY_TYPES = new Set([
  "Patient",
  "Bill",
  "Token",
  "Consultation",
  "PharmacyOrder",
  "User",
  "IpdAdmission",
  "LabOrder",
  "Subscription",
  "Clinic",
  "CashShift",
  "PurchaseOrder",
  "Review",
]);

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    userId?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }>;
}) {
  // P3-44: role gate
  const session = await requireRole(["OWNER", "ADMIN"], "/settings/audit-log");

  // P4-59: server-side pagination + filters. Tables of 50k rows used to
  // ship every entry to the client.
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const actionFilter = sp.action?.trim() || undefined;
  const userIdFilter = sp.userId?.trim() || undefined;
  const entityFilter =
    sp.entityType && KNOWN_ENTITY_TYPES.has(sp.entityType)
      ? sp.entityType
      : undefined;

  // Date filters come in as YYYY-MM-DD from <input type=date>. Treat
  // `from` as start-of-day and `to` as end-of-day (inclusive) in the
  // viewer's local time — anything fancier needs a tz picker.
  const fromRaw = sp.from?.trim() || undefined;
  const toRaw = sp.to?.trim() || undefined;
  const fromDate =
    fromRaw && !isNaN(Date.parse(fromRaw)) ? new Date(fromRaw) : null;
  const toDate =
    toRaw && !isNaN(Date.parse(toRaw))
      ? new Date(new Date(toRaw).getTime() + 24 * 60 * 60 * 1000 - 1)
      : null;

  const t = db(session.user.clinicId);
  const where = {
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(userIdFilter ? { userId: userIdFilter } : {}),
    ...(entityFilter ? { entityType: entityFilter } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const [entries, total, clinicUsers] = await Promise.all([
    t.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    t.auditLog.count({ where }),
    // Users in this clinic for the user-name dropdown. Server-side so
    // the client component never queries the global User table.
    prisma.user.findMany({
      where: { clinicId: session.user.clinicId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(nextPage: number): string {
    const qs = new URLSearchParams();
    qs.set("page", String(nextPage));
    if (actionFilter) qs.set("action", actionFilter);
    if (userIdFilter) qs.set("userId", userIdFilter);
    if (entityFilter) qs.set("entityType", entityFilter);
    if (fromRaw) qs.set("from", fromRaw);
    if (toRaw) qs.set("to", toRaw);
    return `/settings/audit-log?${qs.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every action by every user, with filters and date range.{" "}
          <span className="text-foreground/70">
            {total.toLocaleString()} entries · page {page} of {totalPages}.
          </span>
        </p>
      </div>

      <AuditLogFilters
        initial={{
          action: actionFilter,
          userId: userIdFilter,
          entityType: entityFilter,
          from: fromRaw,
          to: toRaw,
        }}
        users={clinicUsers}
      />

      <AuditLogTable
        initial={entries.map((e) => ({
          id: e.id,
          userId: e.userId,
          userName: e.userName,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
          details: e.details,
          ipAddress: e.ipAddress,
          createdAt: e.createdAt.toISOString(),
        }))}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Showing {(page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className="inline-flex h-8 items-center rounded-md border bg-card px-3 font-medium hover:bg-accent"
            >
              ← Newer
            </Link>
          ) : (
            <span className="inline-flex h-8 items-center rounded-md border border-dashed px-3 opacity-50">
              ← Newer
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              className="inline-flex h-8 items-center rounded-md border bg-card px-3 font-medium hover:bg-accent"
            >
              Older →
            </Link>
          ) : (
            <span className="inline-flex h-8 items-center rounded-md border border-dashed px-3 opacity-50">
              Older →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
