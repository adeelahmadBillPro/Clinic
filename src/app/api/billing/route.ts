import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { createBillSchema } from "@/lib/validations/billing";

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
  const session = await auth();
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
  let totalAmount = subtotal - input.discount;
  let insuranceInfo: Record<string, unknown> | null = null;

  if (input.paymentMethod === "INSURANCE" && input.insuranceInfo) {
    const coveragePct = input.insuranceInfo.coveragePct ?? 0;
    const coveredAmount = Math.round((totalAmount * coveragePct) / 100);
    insuranceInfo = {
      ...input.insuranceInfo,
      coveredAmount,
      patientPortion: totalAmount - coveredAmount,
    };
  }

  const paidAmount = Math.min(input.paidAmount, totalAmount);
  const balance = totalAmount - paidAmount;

  // Generate bill number
  const year = new Date().getFullYear();
  const last = await t.bill.findFirst({
    where: { billNumber: { startsWith: `BL-${year}-` } },
    orderBy: { billNumber: "desc" },
    select: { billNumber: true },
  });
  let nextNum = 1;
  if (last?.billNumber) {
    const match = last.billNumber.match(/-(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const billNumber = `BL-${year}-${String(nextNum).padStart(4, "0")}`;

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
      discount: input.discount,
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
