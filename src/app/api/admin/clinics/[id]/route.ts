import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  action: z.enum(["suspend", "activate", "extendTrial"]),
  days: z.number().int().min(1).max(365).optional(),
});

const deleteSchema = z.object({
  confirmSlug: z.string().min(1),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }

  const clinic = await prisma.clinic.findUnique({ where: { id } });
  if (!clinic) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "suspend") {
    await prisma.clinic.update({
      where: { id },
      data: { isActive: false },
    });
  } else if (parsed.data.action === "activate") {
    await prisma.clinic.update({
      where: { id },
      data: { isActive: true },
    });
  } else if (parsed.data.action === "extendTrial") {
    const days = parsed.data.days ?? 14;
    const base = clinic.trialEndsAt && clinic.trialEndsAt > new Date()
      ? clinic.trialEndsAt
      : new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    await prisma.clinic.update({
      where: { id },
      data: { trialEndsAt: next, isActive: true },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Confirm by typing the clinic slug" },
      { status: 400 },
    );
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true },
  });
  if (!clinic) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  if (parsed.data.confirmSlug !== clinic.slug) {
    return NextResponse.json(
      { success: false, error: "Slug doesn't match — delete cancelled" },
      { status: 400 },
    );
  }

  // Cascade delete every tenant-scoped record for this clinic
  await prisma.$transaction(async (tx) => {
    const w = { clinicId: id };
    await tx.stockMovement.deleteMany({ where: w });
    await tx.purchaseOrder.deleteMany({ where: w });
    await tx.supplier.deleteMany({ where: w });
    await tx.pharmacyOrder.deleteMany({ where: w });
    await tx.prescription.deleteMany({ where: w });
    await tx.medicine.deleteMany({ where: w });
    await tx.vitalSigns.deleteMany({ where: w });
    await tx.consultation.deleteMany({ where: w });
    await tx.labOrder.deleteMany({ where: w });
    await tx.nursingNote.deleteMany({ where: w });
    await tx.ipdAdmission.deleteMany({ where: w });
    await tx.bed.deleteMany({ where: w });
    await tx.review.deleteMany({ where: w });
    await tx.appointment.deleteMany({ where: w });
    await tx.token.deleteMany({ where: w });
    await tx.bill.deleteMany({ where: w });
    await tx.cashShift.deleteMany({ where: w });
    await tx.patient.deleteMany({ where: w });
    await tx.doctor.deleteMany({ where: w });
    await tx.notification.deleteMany({ where: w });
    await tx.auditLog.deleteMany({ where: w });
    await tx.upgradeRequest.deleteMany({ where: w });
    await tx.subscription.deleteMany({ where: w });
    await tx.user.deleteMany({ where: { clinicId: id } });
    await tx.clinic.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
