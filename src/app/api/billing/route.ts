import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { createBillSchema } from "@/lib/validations/billing";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";
import { getIp } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const billType = url.searchParams.get("billType");
  const q = url.searchParams.get("q")?.trim();

  const t = db(session.user.clinicId);
  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (billType && billType !== "ALL") where.billType = billType;
  if (q) where.billNumber = { contains: q, mode: "insensitive" };

  const bills = await t.bill.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const patientIds = Array.from(new Set(bills.map((b) => b.patientId)));
  const patients = await t.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, mrn: true, phone: true },
  });
  const patientById = new Map(patients.map((p) => [p.id, p]));

  const data = bills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    billType: b.billType,
    status: b.status,
    subtotal: Number(b.subtotal),
    discount: Number(b.discount),
    totalAmount: Number(b.totalAmount),
    paidAmount: Number(b.paidAmount),
    balance: Number(b.balance),
    paymentMethod: b.paymentMethod,
    createdAt: b.createdAt.toISOString(),
    patient: patientById.get(b.patientId) ?? null,
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  // Collecting payment mutates revenue records — reception / pharmacist
  // front-desk + admins for corrections.
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

  const body = await req.json().catch(() => ({}));
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: first?.message ?? "Invalid input",
        field: first?.path.join("."),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  const patient = await t.patient.findUnique({
    where: { id: input.patientId },
  });
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found", field: "patientId" },
      { status: 404 },
    );
  }

  const subtotal = input.items.reduce(
    (sum, i) => sum + i.qty * i.unitPrice,
    0,
  );
  // Clamp discount to [0, subtotal] — a client posting discount > subtotal
  // would drive totalAmount negative; a negative would be treated as a
  // credit we never intended.
  const discount = Math.min(Math.max(0, input.discount), subtotal);
  const totalAmount = subtotal - discount;

  // Insurance info is stored as metadata on the bill. We do NOT subtract
  // coveredAmount from the patient's balance here — that decision depends
  // on whether the clinic collects from the patient first (then claims)
  // or claims first (then bills the patient for the remainder), and
  // clinics split both ways. The field exists for reporting / reminders.
  let insuranceInfo: Record<string, unknown> | null = null;
  if (input.paymentMethod === "INSURANCE" && input.insuranceInfo) {
    const coveragePct = input.insuranceInfo.coveragePct ?? 0;
    const coveredAmount = Math.round((totalAmount * coveragePct) / 100);
    insuranceInfo = {
      ...input.insuranceInfo,
      coveredAmount,
      patientPortion: totalAmount - coveredAmount,
      note: "metadata-only; does not affect balance",
    };
  }

  const paidAmount = Math.min(input.paidAmount, totalAmount);
  const balance = totalAmount - paidAmount;

  // Atomic sequence — see src/lib/counter.ts for why findFirst+desc+1 was unsafe.
  const year = new Date().getFullYear();
  const seq = await nextSequence(clinicId, "BILL", undefined, year);
  const billNumber = `BL-${year}-${pad(seq, 4)}`;

  const items = input.items.map((i) => ({
    description: i.description,
    qty: i.qty,
    unitPrice: i.unitPrice,
    amount: i.qty * i.unitPrice,
  }));

  const status =
    paidAmount >= totalAmount
      ? "PAID"
      : paidAmount > 0
        ? "PARTIAL"
        : "PENDING";

  const bill = await t.bill.create({
    data: {
      clinicId,
      billNumber,
      patientId: input.patientId,
      billType: input.billType,
      items,
      subtotal,
      discount,
      discountReason: input.discountReason ?? null,
      totalAmount,
      paidAmount,
      balance,
      paymentMethod: input.paymentMethod,
      insuranceInfo: insuranceInfo ?? undefined,
      status,
      collectedBy: session.user.id,
      notes: input.notes ?? null,
    },
  });

  await t.auditLog.create({
    data: {
      clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "BILL_GENERATED",
      entityType: "Bill",
      entityId: bill.id,
      details: { billNumber: bill.billNumber, total: totalAmount, paidAmount },
    },
  });

  return NextResponse.json({
    success: true,
    data: { id: bill.id, billNumber: bill.billNumber },
  });
}
