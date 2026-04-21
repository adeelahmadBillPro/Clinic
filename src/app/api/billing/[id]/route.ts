import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  // Record additional payment on a partial/pending bill
  const { id } = await params;
  const session = await auth();
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

  const t = db(session.user.clinicId);
  const bill = await t.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json(
      { success: false, error: "Bill not found" },
      { status: 404 },
    );
  }

  const total = Number(bill.totalAmount);
  const alreadyPaid = Number(bill.paidAmount);
  const newPaid = Math.min(alreadyPaid + parsed.data.amount, total);
  const balance = total - newPaid;
  const status =
    newPaid >= total ? "PAID" : newPaid > 0 ? "PARTIAL" : "PENDING";

  await t.bill.update({
    where: { id: bill.id },
    data: {
      paidAmount: newPaid,
      balance,
      status,
      paymentMethod: parsed.data.paymentMethod,
    },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      action: "PAYMENT_COLLECTED",
      entityType: "Bill",
      entityId: bill.id,
      details: {
        billNumber: bill.billNumber,
        amount: parsed.data.amount,
        method: parsed.data.paymentMethod,
      },
    },
  });

  return NextResponse.json({ success: true });
}
