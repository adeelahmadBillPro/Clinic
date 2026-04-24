import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";

const schema = z.object({
  patientId: z.string().min(1),
  bedId: z.string().min(1),
  doctorId: z.string().min(1),
  admissionDiagnosis: z.string().optional(),
  admissionNotes: z.string().optional(),
});

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
  const t = db(session.user.clinicId);
  const admissions = await t.ipdAdmission.findMany({
    where: status ? { status: status as "ADMITTED" | "DISCHARGED" } : undefined,
    orderBy: { admissionDate: "desc" },
    take: 100,
  });
  const patientIds = Array.from(new Set(admissions.map((a) => a.patientId)));
  const bedIds = Array.from(new Set(admissions.map((a) => a.bedId)));
  const patients = await t.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, mrn: true, phone: true },
  });
  const beds = await t.bed.findMany({ where: { id: { in: bedIds } } });
  const byPId = new Map(patients.map((p) => [p.id, p]));
  const byBId = new Map(beds.map((b) => [b.id, b]));

  const data = admissions.map((a) => ({
    id: a.id,
    admissionNumber: a.admissionNumber,
    status: a.status,
    admissionDate: a.admissionDate.toISOString(),
    dischargeDate: a.dischargeDate?.toISOString() ?? null,
    admissionDiagnosis: a.admissionDiagnosis,
    totalCharges: Number(a.totalCharges),
    patient: byPId.get(a.patientId) ?? null,
    bed: byBId.get(a.bedId)
      ? {
          id: byBId.get(a.bedId)!.id,
          bedNumber: byBId.get(a.bedId)!.bedNumber,
          wardName: byBId.get(a.bedId)!.wardName,
          bedType: byBId.get(a.bedId)!.bedType,
          dailyRate: Number(byBId.get(a.bedId)!.dailyRate),
        }
      : null,
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  // Admitting a patient — ward staff (nurse/doctor) + admins.
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
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  // Validate all three FKs are in-tenant. `db(clinicId)` scopes findUnique,
  // so a cross-tenant ID resolves to null.
  const [bed, patient, doctor] = await Promise.all([
    t.bed.findUnique({ where: { id: parsed.data.bedId } }),
    t.patient.findUnique({ where: { id: parsed.data.patientId } }),
    t.doctor.findUnique({ where: { id: parsed.data.doctorId } }),
  ]);
  if (!bed) {
    return NextResponse.json(
      { success: false, error: "Bed not found", field: "bedId" },
      { status: 404 },
    );
  }
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found", field: "patientId" },
      { status: 404 },
    );
  }
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found", field: "doctorId" },
      { status: 404 },
    );
  }
  // Check outside the tx is a fast-path; the CAS inside the tx is what
  // actually prevents two concurrent admits from double-booking the bed.
  if (bed.isOccupied) {
    return NextResponse.json(
      { success: false, error: "Bed is already occupied" },
      { status: 409 },
    );
  }

  const year = new Date().getFullYear();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Atomic bed grab — only succeeds if the bed is still free and
      // active for THIS clinic. A second concurrent admit sees count=0
      // and bails without creating the admission row.
      const grab = await tx.bed.updateMany({
        where: {
          id: parsed.data.bedId,
          clinicId,
          isOccupied: false,
          isActive: true,
        },
        data: {
          isOccupied: true,
          currentPatientId: parsed.data.patientId,
        },
      });
      if (grab.count === 0) {
        throw new BedTakenError();
      }

      const seq = await nextSequence(clinicId, "ADM", tx, year);
      const admissionNumber = `ADM-${year}-${pad(seq, 4)}`;
      const adm = await tx.ipdAdmission.create({
        data: {
          clinicId,
          admissionNumber,
          patientId: parsed.data.patientId,
          bedId: parsed.data.bedId,
          doctorId: parsed.data.doctorId,
          admissionDiagnosis: parsed.data.admissionDiagnosis ?? null,
          admissionNotes: parsed.data.admissionNotes ?? null,
          status: "ADMITTED",
        },
      });
      return adm;
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id, admissionNumber: result.admissionNumber },
    });
  } catch (err) {
    if (err instanceof BedTakenError) {
      return NextResponse.json(
        { success: false, error: "Bed was just taken. Pick another." },
        { status: 409 },
      );
    }
    throw err;
  }
}

class BedTakenError extends Error {}
