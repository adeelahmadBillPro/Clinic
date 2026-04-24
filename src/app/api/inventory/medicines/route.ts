import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  genericName: z.string().optional(),
  category: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  stockQty: z.coerce.number().nonnegative().default(0),
  minStockLevel: z.coerce.number().nonnegative().default(10),
  purchasePrice: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  supplierId: z.string().optional(),
  location: z.string().optional(),
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
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 50));
  const lowStockOnly = url.searchParams.get("lowStock") === "1";

  const t = db(session.user.clinicId);
  const where: Record<string, unknown> = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { genericName: { contains: q, mode: "insensitive" } },
    ];
  }

  const medicines = await t.medicine.findMany({
    where,
    orderBy: { name: "asc" },
    take: limit,
  });

  let filtered = medicines;
  if (lowStockOnly) {
    filtered = medicines.filter(
      (m) => Number(m.stockQty) <= Number(m.minStockLevel),
    );
  }

  const data = filtered.map((m) => ({
    id: m.id,
    name: m.name,
    genericName: m.genericName,
    category: m.category,
    unit: m.unit,
    stockQty: Number(m.stockQty),
    minStockLevel: Number(m.minStockLevel),
    purchasePrice: Number(m.purchasePrice),
    salePrice: Number(m.salePrice),
    batchNumber: m.batchNumber,
    expiryDate: m.expiryDate?.toISOString() ?? null,
    location: m.location,
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  // Creating a medicine changes inventory master data — pharmacy staff + admins.
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
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const t = db(session.user.clinicId);
  const m = await t.medicine.create({
    data: {
      clinicId: session.user.clinicId,
      name: parsed.data.name,
      genericName: parsed.data.genericName ?? null,
      category: parsed.data.category,
      unit: parsed.data.unit,
      stockQty: parsed.data.stockQty,
      minStockLevel: parsed.data.minStockLevel,
      purchasePrice: parsed.data.purchasePrice,
      salePrice: parsed.data.salePrice,
      batchNumber: parsed.data.batchNumber ?? null,
      expiryDate: parsed.data.expiryDate
        ? new Date(parsed.data.expiryDate)
        : null,
      supplierId: parsed.data.supplierId ?? null,
      location: parsed.data.location ?? null,
    },
  });

  if (parsed.data.stockQty > 0) {
    await t.stockMovement.create({
      data: {
        clinicId: session.user.clinicId,
        medicineId: m.id,
        type: "IN",
        qty: parsed.data.stockQty,
        reason: "Initial stock",
        doneBy: session.user.id,
      },
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/pharmacy");

  return NextResponse.json({ success: true, data: { id: m.id } });
}
