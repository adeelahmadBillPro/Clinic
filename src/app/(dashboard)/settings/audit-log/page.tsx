import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { AuditLogTable } from "@/components/settings/AuditLogTable";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — ClinicOS" };

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    userId?: string;
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

  const t = db(session.user.clinicId);
  const where = {
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(userIdFilter ? { userId: userIdFilter } : {}),
  };
  const [entries, total] = await Promise.all([
    t.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    t.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(nextPage: number): string {
    const qs = new URLSearchParams();
    qs.set("page", String(nextPage));
    if (actionFilter) qs.set("action", actionFilter);
    if (userIdFilter) qs.set("userId", userIdFilter);
    return `/settings/audit-log?${qs.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString()} entries · page {page} of {totalPages}
        </p>
      </div>

      {/* Server-side filters: GET form submits as searchParams and the
          page re-renders with `where` applied. */}
      <form
        method="GET"
        action="/settings/audit-log"
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Action (exact)
          </label>
          <Input
            name="action"
            placeholder="e.g. PATIENT_REGISTERED"
            defaultValue={actionFilter ?? ""}
            className="h-8 w-56"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            User ID
          </label>
          <Input
            name="userId"
            placeholder="cuid of the acting user"
            defaultValue={userIdFilter ?? ""}
            className="h-8 w-56"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filter
        </button>
        {(actionFilter || userIdFilter) && (
          <Link
            href="/settings/audit-log"
            className="inline-flex h-8 items-center rounded-md border bg-card px-3 text-xs font-medium hover:bg-accent"
          >
            Clear
          </Link>
        )}
      </form>

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
