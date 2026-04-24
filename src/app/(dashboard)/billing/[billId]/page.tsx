import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { BillDetail } from "@/components/billing/BillDetail";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { billId } = await params;
  const sp = await searchParams;
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "RECEPTIONIST", "PHARMACIST"],
    "/billing/[billId]",
  );

  const t = db(session.user.clinicId);
  const bill = await t.bill.findUnique({ where: { id: billId } });
  if (!bill) notFound();

  const [patient, clinic, collector] = await Promise.all([
    t.patient.findUnique({
      where: { id: bill.patientId },
      select: { id: true, name: true, mrn: true, phone: true, gender: true },
    }),
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, phone: true, address: true, logoUrl: true },
    }),
    prisma.user.findUnique({
      where: { id: bill.collectedBy },
      select: { name: true },
    }),
  ]);

  const serializable = {
    id: bill.id,
    billNumber: bill.billNumber,
    billType: bill.billType,
    status: bill.status,
    items: bill.items as Array<{
      description: string;
      qty: number;
      unitPrice: number;
      amount: number;
    }>,
    subtotal: Number(bill.subtotal),
    discount: Number(bill.discount),
    discountReason: bill.discountReason,
    totalAmount: Number(bill.totalAmount),
    paidAmount: Number(bill.paidAmount),
    balance: Number(bill.balance),
    paymentMethod: bill.paymentMethod,
    insuranceInfo: bill.insuranceInfo as
      | { company?: string; policyNo?: string; coveragePct?: number; coveredAmount?: number; patientPortion?: number }
      | null,
    notes: bill.notes,
    createdAt: bill.createdAt.toISOString(),
  };

  return (
    <div className="space-y-6">
      <Link
        href="/billing"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground no-print"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to billing
      </Link>

      <BillDetail
        bill={serializable}
        patient={patient}
        clinic={clinic}
        collectorName={collector?.name ?? "Staff"}
        autoPrint={sp.print === "1"}
      />
    </div>
  );
}
