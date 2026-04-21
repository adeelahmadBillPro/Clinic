import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { BillingList } from "@/components/billing/BillingList";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing — ClinicOS" };

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const t = db(session.user.clinicId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [bills, todaySum, pendingCount] = await Promise.all([
    t.bill.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    t.bill.aggregate({
      where: { createdAt: { gte: today }, status: { in: ["PAID", "PARTIAL"] } },
      _sum: { paidAmount: true },
    }),
    t.bill.count({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
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
            ₨ {Math.round(Number(todaySum._sum.paidAmount ?? 0)).toLocaleString()}{" "}
            collected today · {pendingCount} bills with pending balance.
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
