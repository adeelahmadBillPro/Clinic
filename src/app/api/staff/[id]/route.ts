import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { z } from "zod";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  status: z.enum(["AVAILABLE", "BUSY", "ON_BREAK", "OFF_DUTY"]).optional(),
  roomNumber: z.string().optional(),
  consultationFee: z.coerce.number().nonnegative().optional(),
  revenueSharePct: z.coerce.number().min(0).max(100).optional(),
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
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
      { status: 403 },
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
  const data = parsed.data;

  const user = await prisma.user.findFirst({
    where: { id, clinicId: session.user.clinicId },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Staff not found" },
      { status: 404 },
    );
  }

  if (data.isActive !== undefined) {
    if (user.id === session.user.id && !data.isActive) {
      return NextResponse.json(
        { success: false, error: "You cannot deactivate yourself" },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: data.isActive },
    });
    await db(session.user.clinicId).auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: data.isActive ? "STAFF_ADDED" : "STAFF_DEACTIVATED",
        entityType: "User",
        entityId: user.id,
      },
    });
  }

  if (
    user.role === "DOCTOR" &&
    (data.isAvailable !== undefined ||
      data.status !== undefined ||
      data.roomNumber !== undefined ||
      data.consultationFee !== undefined ||
      data.revenueSharePct !== undefined)
  ) {
    const docUpdate: Record<string, unknown> = {};
    if (data.isAvailable !== undefined) docUpdate.isAvailable = data.isAvailable;
    if (data.status !== undefined) docUpdate.status = data.status;
    if (data.roomNumber !== undefined) docUpdate.roomNumber = data.roomNumber;
    if (data.consultationFee !== undefined)
      docUpdate.consultationFee = data.consultationFee;
    if (data.revenueSharePct !== undefined)
      docUpdate.revenueSharePct = data.revenueSharePct;

    await db(session.user.clinicId).doctor.updateMany({
      where: { userId: user.id },
      data: docUpdate,
    });
  }

  return NextResponse.json({ success: true });
}
