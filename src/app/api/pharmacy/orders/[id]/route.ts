import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { getIp } from "@/lib/utils";

export async function DELETE(
  req: Request,
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
  const order = await t.pharmacyOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 },
    );
  }
  if (order.status === "DISPENSED" || order.status === "PARTIAL") {
    return NextResponse.json(
      {
        success: false,
        error: "Cannot cancel — already dispensed. Use refund/return flow.",
      },
      { status: 400 },
    );
  }

  await t.pharmacyOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "PHARMACY_ORDER_CANCELLED",
      entityType: "PharmacyOrder",
      entityId: id,
      details: { orderNumber: order.orderNumber },
    },
  });

  return NextResponse.json({ success: true });
}
