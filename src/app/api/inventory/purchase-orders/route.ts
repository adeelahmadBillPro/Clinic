import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";

const itemSchema = z.object({
  medicineId: z.string().optional(),
  name: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(itemSchema).min(1),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "ORDERED"]).default("DRAFT"),
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
  const pos = await t.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const supplierIds = Array.from(new Set(pos.map((p) => p.supplierId)));
  const suppliers = await t.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const data = pos.map((p) => ({
    id: p.id,
    poNumber: p.poNumber,
    status: p.status,
    items: p.items,
    totalAmount: Number(p.totalAmount),
    notes: p.notes,
    orderedAt: p.orderedAt?.toISOString() ?? null,
    receivedAt: p.receivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    supplier: byId.get(p.supplierId) ?? null,
  }));
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  // Creating a PO commits spend — pharmacy staff + admins.
  const gate = await requireApiRole(["OWNER", "ADMIN", "PHARMACIST"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  const year = new Date().getFullYear();
  const seq = await nextSequence(clinicId, "PO", undefined, year);
  const poNumber = `PO-${year}-${pad(seq, 4)}`;

  const totalAmount = parsed.data.items.reduce(
    (s, i) => s + i.qty * i.unitPrice,
    0,
  );

  const po = await t.purchaseOrder.create({
    data: {
      clinicId,
      poNumber,
      supplierId: parsed.data.supplierId,
      items: parsed.data.items.map((i) => ({
        medicineId: i.medicineId ?? null,
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        total: i.qty * i.unitPrice,
      })),
      totalAmount,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      createdBy: session.user.id,
      orderedAt: parsed.data.status === "ORDERED" ? new Date() : null,
    },
  });

  return NextResponse.json({
    success: true,
    data: { id: po.id, poNumber: po.poNumber },
  });
}
