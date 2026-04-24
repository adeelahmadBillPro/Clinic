import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { requireApiRole } from "@/lib/api-guards";
import { getIp } from "@/lib/utils";

const patchSchema = z.object({
  action: z.enum(["cancel"]),
  reason: z.string().trim().max(300).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const { id } = await ctx.params;
  const t = db(session.user.clinicId);
  const po = await t.purchaseOrder.findUnique({ where: { id } });
  if (!po) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }
  const supplier = await t.supplier.findUnique({
    where: { id: po.supplierId },
  });
  return NextResponse.json({
    success: true,
    data: {
      ...po,
      createdAt: po.createdAt.toISOString(),
      orderedAt: po.orderedAt?.toISOString() ?? null,
      receivedAt: po.receivedAt?.toISOString() ?? null,
      supplier: supplier
        ? {
            id: supplier.id,
            name: supplier.name,
            contact: supplier.contact,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
          }
        : null,
    },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // Cancelling a PO is a pharmacy / admin operation.
  const gate = await requireApiRole(["OWNER", "ADMIN", "PHARMACIST"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await ctx.params;
  const t = db(session.user.clinicId);
  const po = await t.purchaseOrder.findUnique({ where: { id } });
  if (!po) {
    return NextResponse.json(
      { success: false, error: "PO not found" },
      { status: 404 },
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  if (parsed.data.action === "cancel") {
    if (po.status === "RECEIVED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "PO is already received. Use a stock adjustment to reverse instead.",
        },
        { status: 400 },
      );
    }
    if (po.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "PO is already cancelled" },
        { status: 400 },
      );
    }
    await t.purchaseOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
        notes: parsed.data.reason
          ? `${po.notes ? po.notes + " · " : ""}Cancelled: ${parsed.data.reason}`
          : po.notes,
      },
    });
    await t.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        ipAddress: getIp(req),
        action: "PO_CANCELLED",
        entityType: "PurchaseOrder",
        entityId: id,
        details: {
          poNumber: po.poNumber,
          reason: parsed.data.reason ?? null,
        },
      },
    });
    revalidatePath("/inventory/purchase-orders");
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: "Unknown action" },
    { status: 400 },
  );
}
