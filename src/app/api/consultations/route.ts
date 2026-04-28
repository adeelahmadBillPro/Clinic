import { NextResponse } from "next/server";
import { db } from "@/lib/tenant-db";
import { saveConsultationSchema } from "@/lib/validations/consultation";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";
import { getIp } from "@/lib/utils";
import { auth } from "@/auth";

// Fetch the existing consultation for a token (used when a doctor reopens
// a COMPLETED token to amend medicines / notes — see DoctorDesk "Today's
// completed" list).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const tokenId = url.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json(
      { success: false, error: "tokenId required" },
      { status: 400 },
    );
  }

  const t = db(session.user.clinicId);
  const consultation = await t.consultation.findFirst({
    where: { tokenId },
  });
  if (!consultation) {
    return NextResponse.json({ success: true, data: null });
  }

  const [vitals, prescription] = await Promise.all([
    t.vitalSigns.findFirst({
      where: { consultationId: consultation.id },
      orderBy: { recordedAt: "desc" },
    }),
    t.prescription.findFirst({
      where: { consultationId: consultation.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      id: consultation.id,
      subjective: consultation.subjective,
      objective: consultation.objective,
      assessment: consultation.assessment,
      plan: consultation.plan,
      diagnosisCodes: consultation.diagnosisCodes,
      followUpDate: consultation.followUpDate?.toISOString() ?? null,
      followUpNotes: consultation.followUpNotes,
      vitals: vitals
        ? {
            bp: vitals.bp,
            pulse: vitals.pulse,
            temperature: vitals.temperature ? Number(vitals.temperature) : null,
            weight: vitals.weight ? Number(vitals.weight) : null,
            height: vitals.height ? Number(vitals.height) : null,
            spO2: vitals.spO2,
            bloodSugar: vitals.bloodSugar ? Number(vitals.bloodSugar) : null,
          }
        : null,
      prescription: prescription
        ? {
            medicines: prescription.medicines,
            notes: prescription.notes,
          }
        : null,
    },
  });
}

export async function POST(req: Request) {
  // Writing a consultation is clinical work: doctor (the author) and
  // admins (for corrections). Never reception / pharmacist.
  const gate = await requireApiRole(["DOCTOR", "OWNER", "ADMIN"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
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

  // Any medicine linked in the prescription must belong to this clinic —
  // otherwise pharmacy could end up dispensing another clinic's stock.
  if (input.medicines?.length) {
    const linked = input.medicines
      .map((m) => m.medicineId)
      .filter((x): x is string => !!x);
    if (linked.length) {
      const found = await t.medicine.findMany({
        where: { id: { in: linked } },
        select: { id: true },
      });
      const foundIds = new Set(found.map((m) => m.id));
      const missing = linked.find((id) => !foundIds.has(id));
      if (missing) {
        return NextResponse.json(
          {
            success: false,
            error: "One of the selected medicines is not in this clinic",
            field: "medicines",
          },
          { status: 400 },
        );
      }
    }
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

    // Vitals — schema bounds keep impossible values out, but guard the
    // BMI formula too: divide-by-near-zero on height < 30cm would produce
    // nonsense, and weight of 0 would yield 0.
    if (input.vitals && Object.keys(input.vitals).length > 0) {
      const v = input.vitals;
      const heightM =
        typeof v.height === "number" && v.height > 50
          ? Number(v.height) / 100
          : null;
      const weightKg =
        typeof v.weight === "number" && v.weight > 0.5 ? Number(v.weight) : null;
      const bmi =
        heightM && weightKg
          ? Number((weightKg / (heightM * heightM)).toFixed(1))
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

      // Also seed a pending pharmacy order so pharmacy sees it. Counter
      // runs inside the same tx to keep sequence + write atomic.
      const year = new Date().getFullYear();
      const seq = await nextSequence(clinicId, "PH", tx, year);
      const orderNumber = `PH-${year}-${pad(seq, 4)}`;

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
        ipAddress: getIp(req),
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
