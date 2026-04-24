import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { getIp } from "@/lib/utils";
import {
  nameSchema,
  phoneSchema,
  optionalPhoneSchema,
} from "@/lib/validations/common";

const patchSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  gender: z.enum(["M", "F", "Other"]).optional(),
  dob: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => {
      if (!v) return true;
      const d = new Date(v);
      return d <= new Date() && d.getFullYear() >= 1900;
    }, "DOB must be in the past (after 1900)"),
  address: z.string().max(300).optional().nullable(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
    .optional()
    .nullable(),
  allergies: z.array(z.string().max(60)).max(20).optional(),
  chronicConditions: z.array(z.string().max(80)).max(20).optional(),
  emergencyContact: z.string().max(100).optional().nullable(),
  emergencyPhone: optionalPhoneSchema,
  // P3-41: manual opt-out toggle until a Twilio STOP webhook is wired in.
  optOutWhatsApp: z.boolean().optional(),
});

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

  const unpaidOpd = await t.bill.findMany({
    where: {
      patientId: id,
      billType: "OPD",
      status: { in: ["PENDING", "PARTIAL"] },
    },
    select: { balance: true },
  });
  const outstanding = unpaidOpd.reduce(
    (sum, b) => sum + Number(b.balance),
    0,
  );

  return NextResponse.json({
    success: true,
    data: { ...patient, outstandingConsultation: outstanding },
  });
}

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
  const t = db(session.user.clinicId);
  const existing = await t.patient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Patient not found" },
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
        field: parsed.error.issues[0]?.path.join("."),
      },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // updateMany + clinicId gates the write to the tenant we know about.
  // The existence check above would usually catch cross-tenant but having
  // the tenant predicate on the write itself is belt-and-braces.
  const updated = await prisma.patient.updateMany({
    where: { id, clinicId: session.user.clinicId },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.phone !== undefined ? { phone: d.phone } : {}),
      ...(d.gender !== undefined ? { gender: d.gender } : {}),
      ...(d.dob !== undefined
        ? { dob: d.dob ? new Date(d.dob) : null }
        : {}),
      ...(d.address !== undefined ? { address: d.address || null } : {}),
      ...(d.bloodGroup !== undefined
        ? { bloodGroup: d.bloodGroup ? d.bloodGroup : null }
        : {}),
      ...(d.allergies !== undefined ? { allergies: d.allergies } : {}),
      ...(d.chronicConditions !== undefined
        ? { chronicConditions: d.chronicConditions }
        : {}),
      ...(d.emergencyContact !== undefined
        ? { emergencyContact: d.emergencyContact || null }
        : {}),
      ...(d.emergencyPhone !== undefined
        ? { emergencyPhone: d.emergencyPhone || null }
        : {}),
      ...(d.optOutWhatsApp !== undefined
        ? { optOutWhatsApp: d.optOutWhatsApp }
        : {}),
    },
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { success: false, error: "Patient not found" },
      { status: 404 },
    );
  }

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "PATIENT_UPDATED",
      entityType: "Patient",
      entityId: id,
      details: { fields: Object.keys(d) },
    },
  });

  return NextResponse.json({ success: true, data: { id } });
}

export async function DELETE(
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
    // Tenant-scoped soft-delete so a misbehaving client can't flip
    // another clinic's patient inactive.
    await prisma.patient.updateMany({
      where: { id, clinicId: session.user.clinicId },
      data: { isActive: false },
    });
    await t.auditLog.create({
      data: {
        clinicId: session.user.clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        ipAddress: getIp(req),
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

  // Safe to hard delete — cascade all clinical records. Every delete is
  // scoped by clinicId as well as patientId so a forged id can't wipe
  // records in a sibling tenant.
  const clinicId = session.user.clinicId;
  await prisma.$transaction(async (tx) => {
    const w = { patientId: id, clinicId };
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
    await tx.patient.deleteMany({ where: { id, clinicId } });
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "PATIENT_DELETED",
      entityType: "Patient",
      entityId: id,
      details: { mrn: patient.mrn, name: patient.name },
    },
  });

  return NextResponse.json({ success: true });
}
