import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";

const schema = z.object({
  bedNumber: z.string().trim().min(1),
  wardName: z.string().trim().min(1),
  bedType: z.enum(["GENERAL", "SEMI_PRIVATE", "PRIVATE", "ICU"]),
  dailyRate: z.coerce.number().nonnegative(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const t = db(session.user.clinicId);
  const beds = await t.bed.findMany({
    where: { isActive: true },
    orderBy: [{ wardName: "asc" }, { bedNumber: "asc" }],
  });

  const patientIds = beds
    .map((b) => b.currentPatientId)
    .filter((x): x is string => !!x);
  const patients = patientIds.length
    ? await t.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, name: true, mrn: true },
      })
    : [];
  const byId = new Map(patients.map((p) => [p.id, p]));

  const data = beds.map((b) => ({
    id: b.id,
    bedNumber: b.bedNumber,
    wardName: b.wardName,
    bedType: b.bedType,
    dailyRate: Number(b.dailyRate),
    isOccupied: b.isOccupied,
    currentPatient: b.currentPatientId
      ? byId.get(b.currentPatientId) ?? null
      : null,
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  // Adding a ward bed is facility configuration — admins only.
  const gate = await requireApiRole(["OWNER", "ADMIN"]);
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
  const t = db(session.user.clinicId);
  const existing = await t.bed.findFirst({
    where: { bedNumber: parsed.data.bedNumber },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "A bed with this number already exists",
        field: "bedNumber",
      },
      { status: 409 },
    );
  }
  const bed = await t.bed.create({
    data: {
      clinicId: session.user.clinicId,
      bedNumber: parsed.data.bedNumber,
      wardName: parsed.data.wardName,
      bedType: parsed.data.bedType,
      dailyRate: parsed.data.dailyRate,
    },
  });
  return NextResponse.json({ success: true, data: { id: bed.id } });
}
