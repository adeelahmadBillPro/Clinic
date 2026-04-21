import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function GET(
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

  const t = db(session.user.clinicId);
  const patient = await t.patient.findUnique({ where: { id } });
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: patient });
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
      { success: false, error: "Only admin/owner can delete patients" },
      { status: 403 },
    );
  }

  const t = db(session.user.clinicId);
  const patient = await t.patient.findUnique({ where: { id } });
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found" },
      { status: 404 },
    );
  }

  // If the patient has paid bills, block hard delete — soft-deactivate instead
  const paidBills = await t.bill.count({
    where: { patientId: id, status: { in: ["PAID", "PARTIAL"] } },
  });
  if (paidBills > 0) {
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
    await t.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: "PATIENT_DEACTIVATED",
        entityType: "Patient",
        entityId: id,
        details: { reason: "had paid bills; hard delete blocked" },
      },
    });
    return NextResponse.json({
      success: true,
      data: { deactivated: true },
    });
  }

  // Safe to hard delete — cascade all clinical records
  await prisma.$transaction(async (tx) => {
    const w = { patientId: id };
    await tx.pharmacyOrder.deleteMany({ where: w });
    await tx.prescription.deleteMany({ where: w });
    await tx.vitalSigns.deleteMany({ where: w });
    await tx.consultation.deleteMany({ where: w });
    await tx.labOrder.deleteMany({ where: w });
    await tx.nursingNote.deleteMany({ where: w });
    await tx.ipdAdmission.deleteMany({ where: w });
    await tx.review.deleteMany({ where: w });
    await tx.appointment.deleteMany({ where: w });
    await tx.token.deleteMany({ where: w });
    await tx.bill.deleteMany({ where: w });
    await tx.patient.delete({ where: { id } });
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      action: "PATIENT_DELETED",
      entityType: "Patient",
      entityId: id,
      details: { mrn: patient.mrn, name: patient.name },
    },
  });

  return NextResponse.json({ success: true });
}
