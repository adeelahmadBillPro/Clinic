import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";

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
  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const orders = await t.pharmacyOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const patientIds = Array.from(new Set(orders.map((o) => o.patientId)));
  const patients = await t.patient.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true, phone: true, mrn: true, allergies: true },
  });
  const patientById = new Map(patients.map((p) => [p.id, p]));

  const data = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    paidAmount: Number(o.paidAmount),
    items: o.items,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    patient: patientById.get(o.patientId) ?? null,
  }));

  return NextResponse.json({ success: true, data });
}
