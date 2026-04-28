import { NextResponse } from "next/server";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";

const schema = z.object({
  dischargeDiagnosis: z.string().optional(),
  dischargeNotes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Discharging creates a bill + frees a bed — doctor/nurse + admins.
  const gate = await requireApiRole(["OWNER", "ADMIN", "DOCTOR", "NURSE"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
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

  // IPD discharge bills *only* bed charges. Pharmacy dispense already
  // creates its own PHARMACY bill at dispense time, and lab orders
  // create LAB bills at order time — rolling them in here would
  // double-bill the patient. Reception sees all of them on the
  // patient's bill list and can collect payment.
  const lineItems = [
    {
      description: `Bed charges · ${bed.wardName} ${bed.bedNumber} (${days} ${days === 1 ? "day" : "days"})`,
      qty: days,
      unitPrice: Number(bed.dailyRate),
      amount: bedCharge,
    },
  ];

  const total = lineItems.reduce((s, l) => s + l.amount, 0);

  const year = new Date().getFullYear();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // CAS on discharge — only the first click succeeds. A re-click
      // would otherwise create a second bill and free an already-free bed.
      const flip = await tx.ipdAdmission.updateMany({
        where: { id: admission.id, clinicId, status: "ADMITTED" },
        data: {
          status: "DISCHARGED",
          dischargeDate: now,
          dischargeDiagnosis: parsed.data.dischargeDiagnosis ?? null,
          dischargeNotes: parsed.data.dischargeNotes ?? null,
          totalCharges: total,
        },
      });
      if (flip.count === 0) {
        throw new AlreadyDischargedError();
      }

      // Bill number allocated inside the same tx as the bill create so a
      // rolled-back discharge doesn't waste a number.
      const seq = await nextSequence(clinicId, "BILL", tx, year);
      const billNumber = `BL-${year}-${pad(seq, 4)}`;
      await tx.bed.update({
        where: { id: bed.id },
        data: { isOccupied: false, currentPatientId: null },
      });
      const bill = await tx.bill.create({
        data: {
          clinicId,
          billNumber,
          patientId: admission.patientId,
          // Attribute IPD bill to the admitting doctor — see P3-33.
          doctorId: admission.doctorId,
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
      },
    });
  } catch (err) {
    if (err instanceof AlreadyDischargedError) {
      return NextResponse.json(
        { success: false, error: "Patient is already discharged" },
        { status: 409 },
      );
    }
    throw err;
  }
}

class AlreadyDischargedError extends Error {}
