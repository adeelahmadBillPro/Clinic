import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { AuditLogTable } from "@/components/settings/AuditLogTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — ClinicOS" };

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/dashboard");

  const t = db(session.user.clinicId);
  const entries = await t.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent activity across your clinic.
        </p>
      </div>
      <AuditLogTable
        initial={entries.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
