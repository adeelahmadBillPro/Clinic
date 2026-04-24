import { NextResponse } from "next/server";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";

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

type PoItem = {
  medicineId?: string | null;
  name?: string;
  qty?: number;
  unitPrice?: number;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Receiving stock mutates inventory — pharmacy staff + admins.
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
  if (po.status === "RECEIVED") {
    // Idempotent response — the CAS below would also reject, but this
    // gives the caller a clearer signal that the work was already done.
    return NextResponse.json(
      { success: false, error: "PO already received" },
      { status: 409 },
    );
  }
  if (po.status === "CANCELLED") {
    return NextResponse.json(
      { success: false, error: "PO is cancelled" },
      { status: 400 },
    );
  }

  // Build a map of the PO's ordered items so we can validate that every
  // submitted line corresponds to something actually on the PO and cap
  // receivedQty at the ordered qty. Without this the client could inflate
  // receivedQty or smuggle in a medicineId that was never part of the PO.
  const poItems = Array.isArray(po.items) ? (po.items as PoItem[]) : [];
  const allowedMedicineIds = new Set(
    poItems.map((i) => i.medicineId).filter((x): x is string => !!x),
  );

  // Validate all submitted medicineIds belong to this clinic AND are on
  // the PO. `db(clinicId)` makes findMany tenant-scoped, so if an id
  // is missing from the returned set it was either cross-tenant or fake.
  const submittedMedicineIds = Array.from(
    new Set(
      parsed.data.items
        .map((i) => i.medicineId)
        .filter((x): x is string => !!x),
    ),
  );
  for (const mid of submittedMedicineIds) {
    if (!allowedMedicineIds.has(mid)) {
      return NextResponse.json(
        {
          success: false,
          error: "Received line references a medicine not on this PO",
          field: "items",
        },
        { status: 400 },
      );
    }
  }
  const validMeds = submittedMedicineIds.length
    ? await t.medicine.findMany({
        where: { id: { in: submittedMedicineIds } },
        select: { id: true },
      })
    : [];
  const validIds = new Set(validMeds.map((m) => m.id));
  for (const mid of submittedMedicineIds) {
    if (!validIds.has(mid)) {
      return NextResponse.json(
        {
          success: false,
          error: "Medicine not found in this clinic",
          field: "items",
        },
        { status: 404 },
      );
    }
  }

  // Cap received qty at ordered qty so a mis-click / malicious client can't
  // inflate stock beyond what was actually ordered.
  const orderedQtyBy = new Map<string, number>();
  for (const pi of poItems) {
    if (pi.medicineId) {
      orderedQtyBy.set(
        pi.medicineId,
        (orderedQtyBy.get(pi.medicineId) ?? 0) + Number(pi.qty ?? 0),
      );
    }
  }
  const cappedItems = parsed.data.items.map((i) => {
    const capped =
      i.medicineId && orderedQtyBy.has(i.medicineId)
        ? Math.min(i.receivedQty, orderedQtyBy.get(i.medicineId)!)
        : i.receivedQty;
    return { ...i, receivedQty: capped };
  });

  try {
    await prisma.$transaction(async (tx) => {
      // Compare-and-swap: only flip to RECEIVED if still in an open status.
      // A second concurrent receive sees count=0 and aborts cleanly.
      const flip = await tx.purchaseOrder.updateMany({
        where: {
          id: po.id,
          clinicId,
          status: { in: ["DRAFT", "ORDERED"] },
        },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          invoiceNumber: parsed.data.invoiceNumber ?? null,
          items: cappedItems.map((i) => ({
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
      if (flip.count === 0) {
        throw new AlreadyReceivedError();
      }

      for (const it of cappedItems) {
        if (it.receivedQty <= 0) continue;
        if (!it.medicineId) continue;
        // Scope medicine stock update to this clinic — prior code used a
        // raw `update({ where: { id } })` which would have silently hit a
        // row in another tenant if the id leaked. `updateMany + clinicId`
        // makes cross-tenant writes impossible.
        await tx.medicine.updateMany({
          where: { id: it.medicineId, clinicId },
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
    });
  } catch (err) {
    if (err instanceof AlreadyReceivedError) {
      return NextResponse.json(
        { success: false, error: "PO already received" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}

class AlreadyReceivedError extends Error {}
