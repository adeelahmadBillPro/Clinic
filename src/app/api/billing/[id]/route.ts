import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";
import { getIp } from "@/lib/utils";

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"]),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const t = db(session.user.clinicId);
  const bill = await t.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json(
      { success: false, error: "Bill not found" },
      { status: 404 },
    );
  }

  const patient = await t.patient.findUnique({
    where: { id: bill.patientId },
    select: { id: true, name: true, mrn: true, phone: true, gender: true },
  });

  const collector = await prisma.user.findUnique({
    where: { id: bill.collectedBy },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...bill,
      subtotal: Number(bill.subtotal),
      discount: Number(bill.discount),
      totalAmount: Number(bill.totalAmount),
      paidAmount: Number(bill.paidAmount),
      balance: Number(bill.balance),
      patient,
      collector,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Record additional payment on a partial/pending bill — reception /
  // pharmacist front-desk plus admins for corrections.
  const { id } = await params;
  const gate = await requireApiRole([
    "OWNER",
    "ADMIN",
    "RECEPTIONIST",
    "PHARMACIST",
    "LAB_TECH",
  ]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const bill = await t.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json(
      { success: false, error: "Bill not found" },
      { status: 404 },
    );
  }

  const total = Number(bill.totalAmount);
  const amount = parsed.data.amount;

  // Reject overpayment outright. The old code silently capped with
  // Math.min, which hid double-counts from the operator.
  if (amount > total - Number(bill.paidAmount)) {
    return NextResponse.json(
      {
        success: false,
        error: "Amount exceeds outstanding balance",
        field: "amount",
      },
      { status: 400 },
    );
  }

  // Atomic increment. Two cashiers collecting at once used to both read
  // paidAmount=0, each add X, and both write X. The `lt: totalAmount`
  // predicate guarantees count=0 once the bill is paid off so a late
  // second collection reports "already paid" instead of silently piling
  // on.
  const flip = await prisma.bill.updateMany({
    where: { id: bill.id, clinicId, paidAmount: { lt: total } },
    data: {
      paidAmount: { increment: amount },
      paymentMethod: parsed.data.paymentMethod,
    },
  });
  if (flip.count === 0) {
    return NextResponse.json(
      { success: false, error: "This bill is already fully paid" },
      { status: 409 },
    );
  }

  // Re-read to compute balance + status from the committed paidAmount.
  const fresh = await t.bill.findUnique({ where: { id: bill.id } });
  if (!fresh) {
    return NextResponse.json(
      { success: false, error: "Bill disappeared" },
      { status: 500 },
    );
  }
  const freshPaid = Number(fresh.paidAmount);
  const balance = total - freshPaid;
  const status =
    freshPaid >= total ? "PAID" : freshPaid > 0 ? "PARTIAL" : "PENDING";

  await t.bill.update({
    where: { id: bill.id },
    data: { balance, status },
  });

  await t.auditLog.create({
    data: {
      clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "PAYMENT_COLLECTED",
      entityType: "Bill",
      entityId: bill.id,
      details: {
        billNumber: bill.billNumber,
        amount,
        method: parsed.data.paymentMethod,
      },
    },
  });

  return NextResponse.json({ success: true });
}
