import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { saveConsultationSchema } from "@/lib/validations/consultation";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = saveConsultationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  const token = await t.token.findUnique({ where: { id: input.tokenId } });
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Token not found" },
      { status: 404 },
    );
  }

  // Upsert consultation for this token
  const existing = await t.consultation.findFirst({
    where: { tokenId: token.id },
  });

  const followUpDate = input.followUpDate ? new Date(input.followUpDate) : null;
  const diagnoses = input.diagnoses ?? [];

  const result = await prisma.$transaction(async (tx) => {
    let consultation;
    if (existing) {
      consultation = await tx.consultation.update({
        where: { id: existing.id },
        data: {
          chiefComplaint: token.chiefComplaint ?? existing.chiefComplaint,
          subjective: input.subjective ?? null,
          objective: input.objective ?? null,
          assessment: input.assessment ?? null,
          plan: input.plan ?? null,
          diagnosisCodes: diagnoses,
          followUpDate,
          followUpNotes: input.followUpNotes ?? null,
          referredTo: input.referredTo ?? null,
        },
      });
    } else {
      consultation = await tx.consultation.create({
        data: {
          clinicId,
          tokenId: token.id,
          patientId: token.patientId,
          doctorId: token.doctorId,
          chiefComplaint: token.chiefComplaint ?? "—",
          subjective: input.subjective ?? null,
          objective: input.objective ?? null,
          assessment: input.assessment ?? null,
          plan: input.plan ?? null,
          diagnosisCodes: diagnoses,
          followUpDate,
          followUpNotes: input.followUpNotes ?? null,
          referredTo: input.referredTo ?? null,
        },
      });
    }

    // Vitals
    if (input.vitals && Object.keys(input.vitals).length > 0) {
      const v = input.vitals;
      const bmi =
        v.weight && v.height
          ? Number((Number(v.weight) / Math.pow(Number(v.height) / 100, 2)).toFixed(1))
          : null;
      await tx.vitalSigns.create({
        data: {
          clinicId,
          patientId: token.patientId,
          consultationId: consultation.id,
          recordedBy: session.user.id,
          bp: v.bp ?? null,
          pulse: v.pulse ?? null,
          temperature: v.temperature ?? null,
          weight: v.weight ?? null,
          height: v.height ?? null,
          spO2: v.spO2 ?? null,
          bloodSugar: v.bloodSugar ?? null,
          bmi: bmi ?? undefined,
        },
      });
    }

    // Prescription — only if medicines were added
    let prescriptionId: string | null = null;
    if (input.medicines && input.medicines.length > 0) {
      const prescription = await tx.prescription.create({
        data: {
          clinicId,
          consultationId: consultation.id,
          patientId: token.patientId,
          doctorId: token.doctorId,
          medicines: input.medicines,
          notes: input.prescriptionNotes ?? null,
          status: "SENT_TO_PHARMACY",
          sentAt: new Date(),
        },
      });
      prescriptionId = prescription.id;

      // Also seed a pending pharmacy order so pharmacy sees it
      const year = new Date().getFullYear();
      const lastOrder = await tx.pharmacyOrder.findFirst({
        where: { clinicId, orderNumber: { startsWith: `PH-${year}-` } },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      let nextNum = 1;
      if (lastOrder?.orderNumber) {
        const match = lastOrder.orderNumber.match(/-(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const orderNumber = `PH-${year}-${String(nextNum).padStart(4, "0")}`;

      const items = input.medicines.map((m) => ({
        medicineId: m.medicineId ?? null,
        name: m.name,
        qty: m.qty ?? 0,
        unitPrice: 0,
        subtotal: 0,
        dispensedQty: 0,
        instructions: m.instructions ?? "",
        dose: m.dose ?? "",
        frequency: m.frequency ?? "",
        duration: m.duration ?? "",
      }));

      await tx.pharmacyOrder.create({
        data: {
          clinicId,
          orderNumber,
          prescriptionId: prescription.id,
          patientId: token.patientId,
          items,
          totalAmount: 0,
          status: "PENDING",
        },
      });
    }

    // Complete the token if requested
    if (input.complete) {
      await tx.token.update({
        where: { id: token.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    } else if (token.status === "CALLED" || token.status === "WAITING") {
      await tx.token.update({
        where: { id: token.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: token.startedAt ?? new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: input.complete
          ? "CONSULTATION_CREATED"
          : "CONSULTATION_UPDATED",
        entityType: "Consultation",
        entityId: consultation.id,
      },
    });

    return { consultationId: consultation.id, prescriptionId };
  });

  return NextResponse.json({ success: true, data: result });
}
