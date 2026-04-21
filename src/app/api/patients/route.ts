import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { createPatientSchema } from "@/lib/validations/patient";
import { nextMrn } from "@/lib/mrn";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  const t = db(session.user.clinicId);

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { mrn: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const patients = await t.patient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      mrn: true,
      name: true,
      phone: true,
      gender: true,
      dob: true,
      bloodGroup: true,
      allergies: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: patients });
}

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

  const parsed = createPatientSchema.safeParse(body);
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

  const data = parsed.data;
  const t = db(session.user.clinicId);

  // Duplicate-phone protection — unless explicitly forced
  if (!data.forceCreate) {
    const existing = await t.patient.findFirst({
      where: { phone: data.phone, isActive: true },
      select: {
        id: true,
        mrn: true,
        name: true,
        phone: true,
        gender: true,
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_PHONE",
          error: `A patient with this phone already exists: ${existing.name} (${existing.mrn}).`,
          match: existing,
        },
        { status: 409 },
      );
    }
  }

  const mrn = await nextMrn(session.user.clinicId);

  const patient = await t.patient.create({
    data: {
      clinicId: session.user.clinicId,
      mrn,
      name: data.name,
      phone: data.phone,
      gender: data.gender,
      dob: data.dob ? new Date(data.dob) : null,
      address: data.address || null,
      bloodGroup: data.bloodGroup ? data.bloodGroup : null,
      allergies: data.allergies ?? [],
      chronicConditions: data.chronicConditions ?? [],
      emergencyContact: data.emergencyContact || null,
      emergencyPhone: data.emergencyPhone || null,
    },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      action: "PATIENT_REGISTERED",
      entityType: "Patient",
      entityId: patient.id,
      details: { mrn: patient.mrn, name: patient.name },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      phone: patient.phone,
    },
  });
}
