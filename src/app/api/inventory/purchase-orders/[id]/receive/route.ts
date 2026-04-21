import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  items: z.array(
    z.object({
      medicineId: z.string().optional().nullable(),
      name: z.string(),
      qty: z.coerce.number(),
      unitPrice: z.coerce.number(),
      receivedQty: z.coerce.number().nonnegative(),
      batchNumber: z.string().optional(),
      expiryDate: z.string().optional(),
    }),
  ),
  invoiceNumber: z.string().optional(),
});

export async function POST(
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const po = await t.purchaseOrder.findUnique({ where: { id } });
  if (!po) {
    return NextResponse.json(
      { success: false, error: "PO not found" },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const it of parsed.data.items) {
      if (it.receivedQty <= 0) continue;
      if (it.medicineId) {
        await tx.medicine.update({
          where: { id: it.medicineId },
          data: {
            stockQty: { increment: it.receivedQty },
            ...(it.batchNumber ? { batchNumber: it.batchNumber } : {}),
            ...(it.expiryDate
              ? { expiryDate: new Date(it.expiryDate) }
              : {}),
          },
        });
        await tx.stockMovement.create({
          data: {
            clinicId,
            medicineId: it.medicineId,
            type: "IN",
            qty: it.receivedQty,
            reason: `GRN — ${po.poNumber}`,
            reference: po.poNumber,
            doneBy: session.user.id,
          },
        });
      }
    }
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
        invoiceNumber: parsed.data.invoiceNumber ?? null,
        items: parsed.data.items.map((i) => ({
          medicineId: i.medicineId ?? null,
          name: i.name,
          qty: i.qty,
          receivedQty: i.receivedQty,
          unitPrice: i.unitPrice,
          total: i.qty * i.unitPrice,
          batchNumber: i.batchNumber ?? null,
          expiryDate: i.expiryDate ?? null,
        })),
      },
    });
  });

  return NextResponse.json({ success: true });
}
