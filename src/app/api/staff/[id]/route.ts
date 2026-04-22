import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { z } from "zod";
import { nameSchema, optionalPhoneSchema } from "@/lib/validations/common";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  status: z.enum(["AVAILABLE", "BUSY", "ON_BREAK", "OFF_DUTY"]).optional(),
  // User fields
  name: nameSchema.optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: optionalPhoneSchema,
  // Doctor fields
  specialization: z.string().trim().max(100).optional(),
  qualification: z.string().trim().max(200).optional(),
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
        {
          success: false,
          error:
            "You cannot deactivate yourself. Ask another admin / owner to do it, or transfer ownership first.",
        },
        { status: 400 },
      );
    }
    // Protect the last active OWNER of the clinic from deactivation —
    // without an active owner nobody can manage subscription / deletion.
    if (!data.isActive && user.role === "OWNER") {
      const activeOwnerCount = await prisma.user.count({
        where: {
          clinicId: session.user.clinicId,
          role: "OWNER",
          isActive: true,
        },
      });
      if (activeOwnerCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This is the only active owner of the clinic. Promote another user to OWNER first, then deactivate.",
          },
          { status: 400 },
        );
      }
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

  // Basic user-profile fields (name / email / phone)
  if (
    data.name !== undefined ||
    data.email !== undefined ||
    data.phone !== undefined
  ) {
    if (data.email && data.email !== user.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email, id: { not: user.id } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { success: false, error: "Email already in use" },
          { status: 400 },
        );
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      },
    });
  }

  if (
    user.role === "DOCTOR" &&
    (data.isAvailable !== undefined ||
      data.status !== undefined ||
      data.roomNumber !== undefined ||
      data.consultationFee !== undefined ||
      data.revenueSharePct !== undefined ||
      data.specialization !== undefined ||
      data.qualification !== undefined)
  ) {
    const docUpdate: Record<string, unknown> = {};
    if (data.isAvailable !== undefined) docUpdate.isAvailable = data.isAvailable;
    if (data.status !== undefined) docUpdate.status = data.status;
    if (data.roomNumber !== undefined) docUpdate.roomNumber = data.roomNumber;
    if (data.consultationFee !== undefined)
      docUpdate.consultationFee = data.consultationFee;
    if (data.revenueSharePct !== undefined)
      docUpdate.revenueSharePct = data.revenueSharePct;
    if (data.specialization !== undefined)
      docUpdate.specialization = data.specialization;
    if (data.qualification !== undefined)
      docUpdate.qualification = data.qualification;

    await db(session.user.clinicId).doctor.updateMany({
      where: { userId: user.id },
      data: docUpdate,
    });
  }

  revalidatePath("/staff");
  revalidatePath("/doctor");
  revalidatePath("/reception");

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
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
      { status: 403 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { id, clinicId: session.user.clinicId },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Staff not found" },
      { status: 404 },
    );
  }
  if (user.id === session.user.id) {
    return NextResponse.json(
      { success: false, error: "You cannot delete yourself." },
      { status: 400 },
    );
  }
  if (user.role === "OWNER") {
    const activeOwnerCount = await prisma.user.count({
      where: {
        clinicId: session.user.clinicId,
        role: "OWNER",
        isActive: true,
      },
    });
    if (activeOwnerCount <= 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This is the only active owner of the clinic. Promote another user to OWNER first.",
        },
        { status: 400 },
      );
    }
  }

  // If they have historical records (bills collected, consultations, etc.)
  // soft-deactivate instead so audit trail stays intact.
  const t = db(session.user.clinicId);
  const [billsCollected, consultations, tokensIssued] = await Promise.all([
    t.bill.count({ where: { collectedBy: user.id } }),
    user.role === "DOCTOR"
      ? t.doctor
          .findFirst({ where: { userId: user.id } })
          .then((d) =>
            d ? t.consultation.count({ where: { doctorId: d.id } }) : 0,
          )
      : Promise.resolve(0),
    t.token.count({ where: { issuedBy: user.id } }),
  ]);

  if (billsCollected > 0 || consultations > 0 || tokensIssued > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
    await t.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: "STAFF_DEACTIVATED_ON_DELETE",
        entityType: "User",
        entityId: user.id,
        details: {
          reason: "Had historical records; soft-deactivated instead of hard delete",
          billsCollected,
          consultations,
          tokensIssued,
        },
      },
    });
    revalidatePath("/staff");
    return NextResponse.json({
      success: true,
      data: { deactivated: true },
    });
  }

  // Safe hard delete — remove doctor profile + user
  await prisma.$transaction(async (tx) => {
    if (user.role === "DOCTOR") {
      await tx.doctor.deleteMany({ where: { userId: user.id } });
    }
    await tx.user.delete({ where: { id: user.id } });
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      action: "STAFF_DELETED",
      entityType: "User",
      entityId: user.id,
      details: { name: user.name, email: user.email, role: user.role },
    },
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  revalidatePath("/reception");

  return NextResponse.json({ success: true });
}
