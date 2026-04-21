import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  dischargeDiagnosis: z.string().optional(),
  dischargeNotes: z.string().optional(),
});

export async function POST(
  req: Request,
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
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const admission = await t.ipdAdmission.findUnique({ where: { id } });
  if (!admission) {
    return NextResponse.json(
      { success: false, error: "Admission not found" },
      { status: 404 },
    );
  }
  if (admission.status === "DISCHARGED") {
    return NextResponse.json(
      { success: false, error: "Already discharged" },
      { status: 400 },
    );
  }

  const bed = await t.bed.findUnique({ where: { id: admission.bedId } });
  if (!bed) {
    return NextResponse.json(
      { success: false, error: "Bed not found" },
      { status: 404 },
    );
  }

  const now = new Date();
  const days = Math.max(
    1,
    Math.ceil(
      (now.getTime() - admission.admissionDate.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const bedCharge = days * Number(bed.dailyRate);

  // Pull linked pharmacy orders + lab orders + consultations from same admission window
  const pharmacyOrders = await t.pharmacyOrder.findMany({
    where: {
      patientId: admission.patientId,
      createdAt: { gte: admission.admissionDate },
      status: { in: ["DISPENSED", "PARTIAL"] },
    },
  });
  const labOrders = await t.labOrder.findMany({
    where: { admissionId: admission.id },
  });

  const pharmacySum = pharmacyOrders.reduce(
    (s, o) => s + Number(o.totalAmount),
    0,
  );
  const labSum = labOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

  const lineItems = [
    {
      description: `Bed charges · ${bed.wardName} ${bed.bedNumber} (${days} ${days === 1 ? "day" : "days"})`,
      qty: days,
      unitPrice: Number(bed.dailyRate),
      amount: bedCharge,
    },
    ...(pharmacySum > 0
      ? [
          {
            description: `Pharmacy charges (${pharmacyOrders.length} orders)`,
            qty: 1,
            unitPrice: pharmacySum,
            amount: pharmacySum,
          },
        ]
      : []),
    ...(labSum > 0
      ? [
          {
            description: `Lab charges (${labOrders.length} orders)`,
            qty: 1,
            unitPrice: labSum,
            amount: labSum,
          },
        ]
      : []),
  ];

  const total = lineItems.reduce((s, l) => s + l.amount, 0);

  // Generate bill number
  const year = new Date().getFullYear();
  const last = await t.bill.findFirst({
    where: { billNumber: { startsWith: `BL-${year}-` } },
    orderBy: { billNumber: "desc" },
    select: { billNumber: true },
  });
  let nextNum = 1;
  if (last?.billNumber) {
    const m = last.billNumber.match(/-(\d+)$/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  const billNumber = `BL-${year}-${String(nextNum).padStart(4, "0")}`;

  const result = await prisma.$transaction(async (tx) => {
    await tx.ipdAdmission.update({
      where: { id: admission.id },
      data: {
        status: "DISCHARGED",
        dischargeDate: now,
        dischargeDiagnosis: parsed.data.dischargeDiagnosis ?? null,
        dischargeNotes: parsed.data.dischargeNotes ?? null,
        totalCharges: total,
      },
    });
    await tx.bed.update({
      where: { id: bed.id },
      data: { isOccupied: false, currentPatientId: null },
    });
    const bill = await tx.bill.create({
      data: {
        clinicId,
        billNumber,
        patientId: admission.patientId,
        billType: "IPD",
        admissionId: admission.id,
        items: lineItems,
        subtotal: total,
        discount: 0,
        totalAmount: total,
        paidAmount: 0,
        balance: total,
        status: "PENDING",
        collectedBy: session.user.id,
      },
    });
    return { billId: bill.id, billNumber };
  });

  return NextResponse.json({
    success: true,
    data: {
      billId: result.billId,
      billNumber: result.billNumber,
      total,
      days,
      bedCharge,
      pharmacySum,
      labSum,
    },
  });
}
