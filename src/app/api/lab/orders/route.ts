import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { findLabTest, LAB_CATALOG } from "@/lib/labCatalog";

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
  const last = await t.labOrder.findFirst({
    where: { orderNumber: { startsWith: `LAB-${year}-` } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let nextNum = 1;
  if (last?.orderNumber) {
    const m = last.orderNumber.match(/-(\d+)$/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  const orderNumber = `LAB-${year}-${String(nextNum).padStart(4, "0")}`;

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
