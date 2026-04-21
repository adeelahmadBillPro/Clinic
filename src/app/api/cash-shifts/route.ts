import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { z } from "zod";

const submitSchema = z.object({
  shiftType: z.enum(["MORNING", "EVENING", "NIGHT", "FULL_DAY"]).default("FULL_DAY"),
  declaredCash: z.coerce.number().nonnegative(),
  openingBalance: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const t = db(session.user.clinicId);
  const where = isAdmin(session.user.role) ? {} : { userId: session.user.id };
  const shifts = await t.cashShift.findMany({
    where,
    orderBy: { shiftDate: "desc" },
    take: 50,
  });
  return NextResponse.json({
    success: true,
    data: shifts.map((s) => ({
      ...s,
      openingBalance: Number(s.openingBalance),
      totalCollected: Number(s.totalCollected),
      declaredCash: Number(s.declaredCash),
      difference: Number(s.difference),
      shiftDate: s.shiftDate.toISOString(),
      submittedAt: s.submittedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  // Staff submits their end-of-shift cash handover
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sum cash bills I collected today
  const agg = await t.bill.aggregate({
    where: {
      collectedBy: session.user.id,
      createdAt: { gte: today },
      status: { in: ["PAID", "PARTIAL"] },
      paymentMethod: "CASH",
    },
    _sum: { paidAmount: true },
  });

  const totalCollected = Number(agg._sum.paidAmount ?? 0);
  const declared = parsed.data.declaredCash;
  const difference = declared - totalCollected;

  const status =
    Math.abs(difference) <= 1
      ? "SUBMITTED"
      : "FLAGGED";

  const shift = await t.cashShift.create({
    data: {
      clinicId,
      userId: session.user.id,
      shiftDate: today,
      shiftType: parsed.data.shiftType,
      openingBalance: parsed.data.openingBalance,
      totalCollected,
      declaredCash: declared,
      difference,
      status,
      notes: parsed.data.notes ?? null,
      submittedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: shift.id,
      totalCollected,
      declared,
      difference,
      status,
    },
  });
}
