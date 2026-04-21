import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  const bed = await t.bed.findUnique({ where: { id: parsed.data.bedId } });
  if (!bed) {
    return NextResponse.json(
      { success: false, error: "Bed not found" },
      { status: 404 },
    );
  }
  if (bed.isOccupied) {
    return NextResponse.json(
      { success: false, error: "Bed is already occupied" },
      { status: 409 },
    );
  }

  const year = new Date().getFullYear();
  const last = await t.ipdAdmission.findFirst({
    where: { admissionNumber: { startsWith: `ADM-${year}-` } },
    orderBy: { admissionNumber: "desc" },
    select: { admissionNumber: true },
  });
  let nextNum = 1;
  if (last?.admissionNumber) {
    const m = last.admissionNumber.match(/-(\d+)$/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  const admissionNumber = `ADM-${year}-${String(nextNum).padStart(4, "0")}`;

  const result = await prisma.$transaction(async (tx) => {
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
    await tx.bed.update({
      where: { id: bed.id },
      data: { isOccupied: true, currentPatientId: parsed.data.patientId },
    });
    return adm;
  });

  return NextResponse.json({
    success: true,
    data: { id: result.id, admissionNumber: result.admissionNumber },
  });
}
