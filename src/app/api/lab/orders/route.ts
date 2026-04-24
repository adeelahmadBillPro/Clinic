import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { findLabTest, LAB_CATALOG } from "@/lib/labCatalog";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";

const schema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional(),
  testCodes: z.array(z.string().min(1)).min(1),
  consultationId: z.string().optional(),
  admissionId: z.string().optional(),
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
  const orders = await t.labOrder.findMany({
    where: status && status !== "ALL" ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const patientIds = Array.from(new Set(orders.map((o) => o.patientId)));
  const patients = await t.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, mrn: true, phone: true },
  });
  const byId = new Map(patients.map((p) => [p.id, p]));

  const data = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    tests: o.tests,
    totalAmount: Number(o.totalAmount),
    results: o.results,
    sampleCollectedAt: o.sampleCollectedAt?.toISOString() ?? null,
    completedAt: o.completedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    patient: byId.get(o.patientId) ?? null,
  }));
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  // Ordering tests charges the patient — doctors + lab / admins.
  const gate = await requireApiRole([
    "OWNER",
    "ADMIN",
    "DOCTOR",
    "LAB_TECH",
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  // FK tenant validation. `db(clinicId)` scopes findUnique so a cross-tenant
  // id resolves to null.
  const patient = await t.patient.findUnique({
    where: { id: parsed.data.patientId },
  });
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found", field: "patientId" },
      { status: 404 },
    );
  }
  if (parsed.data.doctorId) {
    const doc = await t.doctor.findUnique({
      where: { id: parsed.data.doctorId },
    });
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Doctor not found", field: "doctorId" },
        { status: 404 },
      );
    }
  }
  if (parsed.data.consultationId) {
    const cons = await t.consultation.findUnique({
      where: { id: parsed.data.consultationId },
    });
    if (!cons) {
      return NextResponse.json(
        { success: false, error: "Consultation not found", field: "consultationId" },
        { status: 404 },
      );
    }
  }
  if (parsed.data.admissionId) {
    const adm = await t.ipdAdmission.findUnique({
      where: { id: parsed.data.admissionId },
    });
    if (!adm) {
      return NextResponse.json(
        { success: false, error: "Admission not found", field: "admissionId" },
        { status: 404 },
      );
    }
  }

  const tests = parsed.data.testCodes
    .map((c) => findLabTest(c))
    .filter((x): x is (typeof LAB_CATALOG)[number] => !!x);
  if (tests.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid tests selected" },
      { status: 400 },
    );
  }

  const total = tests.reduce((s, t) => s + t.price, 0);

  const year = new Date().getFullYear();
  const seq = await nextSequence(clinicId, "LAB", undefined, year);
  const orderNumber = `LAB-${year}-${pad(seq, 4)}`;

  // Doctor can be inferred from consultation if not provided
  let doctorId = parsed.data.doctorId;
  if (!doctorId && parsed.data.consultationId) {
    const cons = await t.consultation.findUnique({
      where: { id: parsed.data.consultationId },
    });
    if (cons) doctorId = cons.doctorId;
  }
  if (!doctorId) {
    return NextResponse.json(
      { success: false, error: "doctorId required", field: "doctorId" },
      { status: 400 },
    );
  }

  const order = await t.labOrder.create({
    data: {
      clinicId,
      orderNumber,
      patientId: parsed.data.patientId,
      doctorId,
      consultationId: parsed.data.consultationId ?? null,
      admissionId: parsed.data.admissionId ?? null,
      tests: tests.map((t) => ({
        code: t.code,
        name: t.name,
        price: t.price,
        sampleType: t.sampleType,
        parameters: t.parameters,
      })),
      totalAmount: total,
      status: "ORDERED",
    },
  });

  return NextResponse.json({
    success: true,
    data: { id: order.id, orderNumber: order.orderNumber, total },
  });
}
