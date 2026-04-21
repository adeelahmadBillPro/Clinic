import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum([
    "ORDERED",
    "SAMPLE_COLLECTED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  results: z
    .array(
      z.object({
        testCode: z.string(),
        parameter: z.string(),
        value: z.string().optional().or(z.literal("")),
        unit: z.string().optional(),
        normalRange: z.string().optional(),
        isAbnormal: z.boolean().optional(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
});

export async function PATCH(
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
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const t = db(session.user.clinicId);
  const order = await t.labOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 },
    );
  }

  const data: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "SAMPLE_COLLECTED" && !order.sampleCollectedAt) {
    data.sampleCollectedAt = new Date();
  }
  if (parsed.data.status === "COMPLETED") {
    data.completedAt = new Date();
    data.processedBy = session.user.id;
  }
  if (parsed.data.results) data.results = parsed.data.results;

  await t.labOrder.update({ where: { id: order.id }, data });

  return NextResponse.json({ success: true });
}

export async function GET(
  _req: Request,
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
  const t = db(session.user.clinicId);
  const order = await t.labOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }
  const patient = await t.patient.findUnique({
    where: { id: order.patientId },
    select: { id: true, name: true, mrn: true, phone: true, dob: true, gender: true },
  });
  return NextResponse.json({
    success: true,
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      tests: order.tests,
      results: order.results,
      totalAmount: Number(order.totalAmount),
      sampleCollectedAt: order.sampleCollectedAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      patient,
    },
  });
}
