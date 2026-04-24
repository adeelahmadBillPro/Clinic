import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { getIp } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners / admins can reset tokens" },
      { status: 403 },
    );
  }

  const t = db(session.user.clinicId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await t.token.updateMany({
    where: {
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
      issuedAt: { gte: today },
    },
    data: {
      status: "EXPIRED",
      cancelReason: `Manually reset by ${session.user.name}`,
    },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "TOKEN_RESET",
      entityType: "Token",
      details: { expiredCount: count },
    },
  });

  return NextResponse.json({ success: true, data: { expired: count } });
}
