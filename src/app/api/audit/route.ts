import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";

export async function GET(req: Request) {
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
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const userId = url.searchParams.get("userId");
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 100));

  const t = db(session.user.clinicId);
  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;

  const entries = await t.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    success: true,
    data: entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
