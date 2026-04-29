import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-guards";
import { nextSequence, pad } from "@/lib/counter";
import { nextMrn } from "@/lib/mrn";
import { getIp } from "@/lib/utils";

class InsufficientStockError extends Error {
  medicineName: string;
  constructor(name: string) {
    super(`INSUFFICIENT_STOCK:${name}`);
    this.medicineName = name;
  }
}

const itemSchema = z.object({
  medicineId: z.string().optional().nullable(),
  name: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

// Walk-in OTC sale: pharmacist serves a customer who walked in directly,
// without a doctor consultation. Either pick an existing patient or
// quick-register a new one with just name + phone.
const schema = z
  .object({
    patientId: z.string().optional(),
    newPatient: z
      .object({
        name: z.string().trim().min(1, "Name required"),
        phone: z.string().trim().optional(),
        gender: z.enum(["M", "F", "OTHER"]).optional(),
      })
      .optional(),
    items: z.array(itemSchema).min(1, "Add at least one medicine"),
    paymentMethod: z
      .enum(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"])
      .default("CASH"),
    amountReceived: z.coerce.number().nonnegative().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => !!v.patientId || !!v.newPatient, {
    message: "Pick an existing patient or fill in walk-in details",
    path: ["patientId"],
  });

export async function POST(req: Request) {
  // OTC selling mirrors prescription dispense — pharmacist + admins.
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
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        field: parsed.error.issues[0]?.path.join("."),
      },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const input = parsed.data;

  // If picking an existing patient, confirm it lives in this clinic.
  // db(clinicId) scopes findUnique → cross-tenant id resolves to null.
  if (input.patientId) {
    const exists = await t.patient.findUnique({ where: { id: input.patientId } });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Patient not found", field: "patientId" },
        { status: 404 },
      );
    }
  }

  const total = input.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const paid =
    typeof input.amountReceived === "number"
      ? Math.min(input.amountReceived, total)
      : total;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Resolve the patient — either existing or quick-create.
      let patientId = input.patientId ?? null;
      let createdPatient: { id: string; mrn: string; name: string } | null =
        null;
      if (!patientId && input.newPatient) {
        const mrn = await nextMrn(clinicId, tx);
        const created = await tx.patient.create({
          data: {
            clinicId,
            mrn,
            name: input.newPatient.name,
            phone: input.newPatient.phone ?? "",
            gender: input.newPatient.gender ?? "OTHER",
            allergies: [],
            chronicConditions: [],
          },
        });
        patientId = created.id;
        createdPatient = { id: created.id, mrn: created.mrn, name: created.name };
      }
      if (!patientId) {
        // Should be unreachable thanks to the schema refine, but guard anyway.
        throw new Error("PATIENT_RESOLUTION_FAILED");
      }

      // Conditional decrement — only succeeds when stockQty >= qty AND the
      // medicine belongs to this clinic. Same race-safe pattern as the
      // prescription dispense flow.
      for (const it of input.items) {
        if (!it.medicineId) continue; // free-text item, no inventory link
        const flip = await tx.medicine.updateMany({
          where: {
            id: it.medicineId,
            clinicId,
            stockQty: { gte: it.qty },
          },
          data: { stockQty: { decrement: it.qty } },
        });
        if (flip.count === 0) {
          throw new InsufficientStockError(it.name);
        }
        await tx.stockMovement.create({
          data: {
            clinicId,
            medicineId: it.medicineId,
            type: "OUT",
            qty: it.qty,
            reason: "OTC walk-in sale",
            doneBy: session.user.id,
          },
        });
      }

      // Atomic bill number.
      const year = new Date().getFullYear();
      const seq = await nextSequence(clinicId, "BILL", tx, year);
      const billNumber = `BL-${year}-${pad(seq, 4)}`;

      const bill = await tx.bill.create({
        data: {
          clinicId,
          billNumber,
          patientId,
          // No prescribing doctor for walk-ins — leave null.
          doctorId: null,
          billType: "PHARMACY",
          items: input.items.map((i) => ({
            kind: "dispensed" as const,
            description: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            amount: i.qty * i.unitPrice,
          })),
          subtotal: total,
          discount: 0,
          totalAmount: total,
          paidAmount: paid,
          balance: total - paid,
          paymentMethod: input.paymentMethod,
          status:
            paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
          collectedBy: session.user.id,
          notes: input.notes ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          clinicId,
          userId: session.user.id,
          userName: session.user.name ?? "User",
          ipAddress: getIp(req),
          action: "PHARMACY_OTC_SALE",
          entityType: "Bill",
          entityId: bill.id,
          details: {
            billNumber: bill.billNumber,
            total,
            walkIn: !!createdPatient,
            patientName: createdPatient?.name ?? null,
          },
        },
      });

      return {
        billId: bill.id,
        billNumber: bill.billNumber,
        patientId,
        createdPatient,
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
