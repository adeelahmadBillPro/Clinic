import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().optional(),
  genericName: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  stockQty: z.coerce.number().optional(),
  minStockLevel: z.coerce.number().optional(),
  purchasePrice: z.coerce.number().optional(),
  salePrice: z.coerce.number().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
  stockAdjustment: z
    .object({
      delta: z.coerce.number(),
      reason: z.string().min(1),
    })
    .optional(),
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const t = db(session.user.clinicId);
  const med = await t.medicine.findUnique({ where: { id } });
  if (!med) {
    return NextResponse.json(
      { success: false, error: "Medicine not found" },
      { status: 404 },
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};
  for (const k of [
    "name",
    "genericName",
    "category",
    "unit",
    "minStockLevel",
    "purchasePrice",
    "salePrice",
    "batchNumber",
    "location",
    "isActive",
  ] as const) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  if (data.expiryDate !== undefined) {
    update.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
  }
  if (data.stockQty !== undefined) update.stockQty = data.stockQty;

  await t.medicine.update({ where: { id: med.id }, data: update });

  if (data.stockAdjustment) {
    const delta = data.stockAdjustment.delta;
    await t.medicine.update({
      where: { id: med.id },
      data: {
        stockQty: { increment: delta },
      },
    });
    await t.stockMovement.create({
      data: {
        clinicId: session.user.clinicId,
        medicineId: med.id,
        type: delta >= 0 ? "IN" : "ADJUSTMENT",
        qty: Math.abs(delta),
        reason: data.stockAdjustment.reason,
        doneBy: session.user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
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
  await t.medicine.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
