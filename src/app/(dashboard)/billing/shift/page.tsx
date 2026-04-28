import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CashShiftsClient } from "@/components/billing/CashShiftsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cash shifts — ClinicOS" };

export default async function CashShiftsPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "RECEPTIONIST", "PHARMACIST"],
    "/billing/shift",
  );

  const t = db(session.user.clinicId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // My cash collections today
  const agg = await t.bill.aggregate({
    where: {
      collectedBy: session.user.id,
      createdAt: { gte: today },
      status: { in: ["PAID", "PARTIAL"] },
      paymentMethod: "CASH",
    },
    _sum: { paidAmount: true },
  });
  const myCashToday = Number(agg._sum.paidAmount ?? 0);

  const shifts = await t.cashShift.findMany({
    where: isAdmin(session.user.role) ? {} : { userId: session.user.id },
    orderBy: { shiftDate: "desc" },
    take: 30,
  });

  const userIds = Array.from(new Set(shifts.map((s) => s.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash shifts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open and close cash shifts. Reconcile end-of-day cash.
        </p>
      </div>
      <CashShiftsClient
        myCashToday={myCashToday}
        isAdmin={isAdmin(session.user.role)}
        shifts={shifts.map((s) => ({
          id: s.id,
          userId: s.userId,
          userName: byId.get(s.userId) ?? "?",
          shiftDate: s.shiftDate.toISOString(),
          shiftType: s.shiftType,
          totalCollected: Number(s.totalCollected),
          declaredCash: Number(s.declaredCash),
          difference: Number(s.difference),
          status: s.status,
          submittedAt: s.submittedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
