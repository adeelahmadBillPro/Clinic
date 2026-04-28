import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";

// P5-? distinct list of action tags actually present in this clinic's
// audit log, so the audit-log filter can render a usable dropdown
// instead of a free-text "type the exact PATIENT_REGISTERED string"
// input. Admin-only because the underlying audit log is admin-only.
export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
      { status: 403 },
    );
  }

  const t = db(session.user.clinicId);
  const rows = await t.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: rows.map((r) => r.action),
  });
}
