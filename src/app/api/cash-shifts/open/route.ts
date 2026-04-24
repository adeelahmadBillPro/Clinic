import { NextResponse } from "next/server";
import { db } from "@/lib/tenant-db";
import { requireApiRole } from "@/lib/api-guards";
import { getIp } from "@/lib/utils";

export async function POST(req: Request) {
  // Opening a cash shift — staff who handle cash.
  const gate = await requireApiRole([
    "OWNER",
    "ADMIN",
    "RECEPTIONIST",
    "PHARMACIST",
  ]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const t = db(session.user.clinicId);
  // Don't double-open
  const existing = await t.cashShift.findFirst({
    where: { userId: session.user.id, status: "OPEN" },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      data: { id: existing.id, alreadyOpen: true },
    });
  }

  const body = await req.json().catch(() => ({}));
  const shiftType = ["MORNING", "EVENING", "NIGHT"].includes(body?.shiftType)
    ? body.shiftType
    : defaultShiftType();

  const shift = await t.cashShift.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      shiftDate: new Date(),
      shiftType,
      openingBalance: 0,
      totalCollected: 0,
      declaredCash: 0,
      difference: 0,
      status: "OPEN",
    },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "CASH_SHIFT_OPENED",
      entityType: "CashShift",
      entityId: shift.id,
      details: { shiftType },
    },
  });

  return NextResponse.json({ success: true, data: { id: shift.id } });
}

function defaultShiftType(): "MORNING" | "EVENING" | "NIGHT" {
  const h = new Date().getHours();
  if (h < 14) return "MORNING";
  if (h < 22) return "EVENING";
  return "NIGHT";
}
