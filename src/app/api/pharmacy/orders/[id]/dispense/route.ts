import { NextResponse } from "next/server";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";
import { getIp } from "@/lib/utils";

class InsufficientStockError extends Error {
  medicineName: string;
  constructor(name: string) {
    super(`INSUFFICIENT_STOCK:${name}`);
    this.medicineName = name;
  }
}

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
  // Dispensing decrements stock and records payment — pharmacist /
  // admin only. Everyone else would corrupt inventory.
  const gate = await requireApiRole(["PHARMACIST", "OWNER", "ADMIN"]);
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

  // Attribute revenue to the prescribing doctor (P3-33). PharmacyOrder
  // links back to a Prescription; the doctor on that prescription is the
  // one whose order generated this bill.
  let prescribingDoctorId: string | null = null;
  if (order.prescriptionId) {
    const rx = await t.prescription.findUnique({
      where: { id: order.prescriptionId },
      select: { doctorId: true },
    });
    prescribingDoctorId = rx?.doctorId ?? null;
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

  try {
    const result = await prisma.$transaction(async (tx) => {
    // Conditional decrement — only succeeds when stockQty >= qty AND the
    // medicine belongs to this clinic. Without this, two pharmacists
    // dispensing the last 3 tablets each would both succeed and leave
    // stockQty at -3.
    for (const it of dispensedItems) {
      if (!it.medicineId || it.dispensedQty <= 0) continue;
      const flip = await tx.medicine.updateMany({
        where: {
          id: it.medicineId,
          clinicId,
          stockQty: { gte: it.dispensedQty },
        },
        data: { stockQty: { decrement: it.dispensedQty } },
      });
      if (flip.count === 0) {
        throw new InsufficientStockError(it.name);
      }
      await tx.stockMovement.create({
        data: {
          clinicId,
          medicineId: it.medicineId,
          type: "OUT",
          qty: it.dispensedQty,
          reason: `Dispensed — ${order.orderNumber}`,
          reference: order.orderNumber,
          doneBy: session.user.id,
        },
      });
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

    // Atomic bill number — see src/lib/counter.ts.
    const year = new Date().getFullYear();
    const seq = await nextSequence(clinicId, "BILL", tx, year);
    const billNumber = `BL-${year}-${pad(seq, 4)}`;

    // Bill items in two flavours:
    //   `kind: "dispensed"`  → counted toward total, patient pays for these
    //   `kind: "not_dispensed"` → amount=0, qty=shortBy. Carried for the
    //     printed receipt so the patient sees what to buy elsewhere.
    // BillDetail renders them in separate sections; total math is unchanged
    // because amount=0 on not_dispensed.
    const billItems = [
      ...dispensedItems
        .filter((i) => i.dispensedQty > 0)
        .map((i) => ({
          kind: "dispensed" as const,
          description: i.name,
          qty: i.dispensedQty,
          unitPrice: i.unitPrice,
          amount: i.unitPrice * i.dispensedQty,
        })),
      ...dispensedItems
        .filter((i) => i.dispensedQty < i.qty)
        .map((i) => ({
          kind: "not_dispensed" as const,
          description: i.name,
          qty: i.qty - i.dispensedQty,
          unitPrice: 0,
          amount: 0,
        })),
    ];

    const bill = await tx.bill.create({
      data: {
        clinicId,
        billNumber,
        patientId: order.patientId,
        // Attribute to prescribing doctor when known — see P3-33.
        doctorId: prescribingDoctorId,
        billType: "PHARMACY",
        items: billItems,
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
        ipAddress: getIp(req),
        action: "PRESCRIPTION_DISPENSED",
        entityType: "PharmacyOrder",
        entityId: order.id,
        details: { orderNumber: order.orderNumber, total },
      },
    });

    // Items the pharmacist couldn't fulfil — patient buys these
    // elsewhere using the printed Rx slip.
    const notDispensed = dispensedItems
      .filter((i) => i.dispensedQty < i.qty)
      .map((i) => ({
        name: i.name,
        requestedQty: i.qty,
        dispensedQty: i.dispensedQty,
        shortBy: i.qty - i.dispensedQty,
      }));

    return {
      orderId: updatedOrder.id,
      billId: bill.id,
      billNumber,
      status,
      notDispensed,
    };
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock for ${err.medicineName}`,
        },
        { status: 409 },
      );
    }
    throw err;
  }
}
