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
      qty: z.coerce.number().nonnegative(),
      dispensedQty: z.coerce.number().nonnegative(),
      unitPrice: z.coerce.number().nonnegative(),
    }),
  ),
  paymentMethod: z
    .enum(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"])
    .default("CASH"),
  amountReceived: z.coerce.number().nonnegative().optional(),
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
  const order = await t.pharmacyOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 },
    );
  }

  const dispensedItems = parsed.data.items;
  const anyDispensed = dispensedItems.some((i) => i.dispensedQty > 0);
  if (!anyDispensed) {
    return NextResponse.json(
      { success: false, error: "Nothing selected to dispense" },
      { status: 400 },
    );
  }

  const total = dispensedItems.reduce(
    (sum, i) => sum + i.unitPrice * i.dispensedQty,
    0,
  );

  const paid =
    typeof parsed.data.amountReceived === "number"
      ? Math.min(parsed.data.amountReceived, total)
      : total;

  const allRequestedMet = dispensedItems.every(
    (i) => i.dispensedQty >= i.qty,
  );
  const status = allRequestedMet ? "DISPENSED" : "PARTIAL";

  const result = await prisma.$transaction(async (tx) => {
    // Decrement stock for each item with a medicineId
    for (const it of dispensedItems) {
      if (!it.medicineId || it.dispensedQty <= 0) continue;
      const med = await tx.medicine.findFirst({
        where: { id: it.medicineId, clinicId },
      });
      if (med) {
        await tx.medicine.update({
          where: { id: med.id },
          data: {
            stockQty: { decrement: it.dispensedQty },
          },
        });
        await tx.stockMovement.create({
          data: {
            clinicId,
            medicineId: med.id,
            type: "OUT",
            qty: it.dispensedQty,
            reason: `Dispensed — ${order.orderNumber}`,
            reference: order.orderNumber,
            doneBy: session.user.id,
          },
        });
      }
    }

    const updatedOrder = await tx.pharmacyOrder.update({
      where: { id: order.id },
      data: {
        items: dispensedItems.map((i) => ({
          medicineId: i.medicineId ?? null,
          name: i.name,
          qty: i.qty,
          dispensedQty: i.dispensedQty,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.dispensedQty,
        })),
        totalAmount: total,
        paidAmount: paid,
        status,
        dispensedBy: session.user.id,
      },
    });

    // Generate bill
    const year = new Date().getFullYear();
    const last = await tx.bill.findFirst({
      where: { clinicId, billNumber: { startsWith: `BL-${year}-` } },
      orderBy: { billNumber: "desc" },
      select: { billNumber: true },
    });
    let nextNum = 1;
    if (last?.billNumber) {
      const match = last.billNumber.match(/-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const billNumber = `BL-${year}-${String(nextNum).padStart(4, "0")}`;

    const bill = await tx.bill.create({
      data: {
        clinicId,
        billNumber,
        patientId: order.patientId,
        billType: "PHARMACY",
        items: dispensedItems.map((i) => ({
          description: i.name,
          qty: i.dispensedQty,
          unitPrice: i.unitPrice,
          amount: i.unitPrice * i.dispensedQty,
        })),
        subtotal: total,
        discount: 0,
        totalAmount: total,
        paidAmount: paid,
        balance: total - paid,
        paymentMethod: parsed.data.paymentMethod,
        status:
          paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
        collectedBy: session.user.id,
      },
    });

    if (order.prescriptionId) {
      await tx.prescription.update({
        where: { id: order.prescriptionId },
        data: { status: allRequestedMet ? "DISPENSED" : "PARTIAL" },
      });
    }

    await tx.auditLog.create({
      data: {
        clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: "PRESCRIPTION_DISPENSED",
        entityType: "PharmacyOrder",
        entityId: order.id,
        details: { orderNumber: order.orderNumber, total },
      },
    });

    return { orderId: updatedOrder.id, billId: bill.id, billNumber };
  });

  return NextResponse.json({ success: true, data: result });
}
