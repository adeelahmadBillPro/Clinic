import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { BillingList } from "@/components/billing/BillingList";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing — ClinicOS" };

export default async function BillingPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "RECEPTIONIST", "PHARMACIST"],
    "/billing",
  );

  const t = db(session.user.clinicId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Role-based filter on which bills this user should see / collect
  const role = session.user.role;
  const scopedTypeFilter: Record<string, unknown> =
    role === "PHARMACIST"
      ? { billType: "PHARMACY" }
      : role === "RECEPTIONIST"
        ? { billType: { in: ["OPD", "LAB", "IPD"] } }
        : role === "LAB_TECH"
          ? { billType: "LAB" }
          : {}; // OWNER / ADMIN / DOCTOR see everything

  const [bills, todaySum, pendingCount] = await Promise.all([
    t.bill.findMany({
      where: scopedTypeFilter,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    t.bill.aggregate({
      where: {
        ...scopedTypeFilter,
        createdAt: { gte: today },
        status: { in: ["PAID", "PARTIAL"] },
      },
      _sum: { paidAmount: true },
    }),
    t.bill.count({
      where: {
        ...scopedTypeFilter,
        status: { in: ["PENDING", "PARTIAL"] },
      },
    }),
  ]);

  const patientIds = Array.from(new Set(bills.map((b) => b.patientId)));
  const patients = await t.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, mrn: true },
  });
  const patientById = new Map(patients.map((p) => [p.id, p]));

  const initialRows = bills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    billType: b.billType,
    status: b.status,
    totalAmount: Number(b.totalAmount),
    paidAmount: Number(b.paidAmount),
    balance: Number(b.balance),
    paymentMethod: b.paymentMethod,
    createdAt: b.createdAt.toISOString(),
    patient: patientById.get(b.patientId) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All bills across OPD, pharmacy, lab and IPD.{" "}
            <span className="text-foreground/70">
              ₨{" "}
              {Math.round(
                Number(todaySum._sum.paidAmount ?? 0),
              ).toLocaleString()}{" "}
              today · {pendingCount} pending.
            </span>
          </p>
        </div>
        <Link href="/billing/new" className={cn(buttonVariants())}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New bill
        </Link>
      </div>

      <BillingList initial={initialRows} />
    </div>
  );
}
