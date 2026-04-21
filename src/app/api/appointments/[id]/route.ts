import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { nextTokenNumber, tokenExpiryFromNow } from "@/lib/token";
import { nextMrn } from "@/lib/mrn";

const patchSchema = z.object({
  status: z
    .enum([
      "SCHEDULED",
      "CONFIRMED",
      "CHECKED_IN",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .optional(),
  checkIn: z.boolean().optional(),
  chiefComplaint: z.string().optional(),
  // Reception can link existing patient or auto-register at check-in.
  linkExistingPatientId: z.string().optional(),
  createPatient: z
    .object({
      name: z.string().trim().min(2),
      phone: z.string().trim().min(7),
      gender: z.enum(["M", "F", "Other"]).default("M"),
      dob: z.string().optional(),
      bloodGroup: z.string().optional(),
    })
    .optional(),
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
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const appt = await t.appointment.findUnique({ where: { id } });
  if (!appt) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }

  if (parsed.data.checkIn) {
    // Resolve patientId: either already on the appointment, or provided in the request.
    let patientId = appt.patientId;

    if (!patientId && parsed.data.linkExistingPatientId) {
      patientId = parsed.data.linkExistingPatientId;
    }

    if (!patientId && parsed.data.createPatient) {
      const mrn = await nextMrn(clinicId);
      const cp = parsed.data.createPatient;
      const created = await t.patient.create({
        data: {
          clinicId,
          mrn,
          name: cp.name,
          phone: cp.phone,
          gender: cp.gender,
          dob: cp.dob ? new Date(cp.dob) : null,
          bloodGroup: cp.bloodGroup || null,
        },
      });
      patientId = created.id;
      await t.auditLog.create({
        data: {
          clinicId,
          userId: session.user.id,
          userName: session.user.name ?? "User",
          action: "PATIENT_REGISTERED",
          entityType: "Patient",
          entityId: created.id,
          details: {
            mrn,
            name: created.name,
            via: "appointment-checkin",
          },
        },
      });
    }

    if (!patientId) {
      return NextResponse.json(
        {
          success: false,
          code: "NEEDS_PATIENT",
          error:
            "No patient record linked yet. Pick an existing patient or register a new one.",
        },
        { status: 400 },
      );
    }

    const doctor = await t.doctor.findUnique({
      where: { id: appt.doctorId },
    });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 },
      );
    }
    const { tokenNumber, displayToken } = await nextTokenNumber(
      clinicId,
      appt.doctorId,
    );
    const token = await t.token.create({
      data: {
        clinicId,
        tokenNumber,
        displayToken,
        patientId,
        doctorId: appt.doctorId,
        type: "OPD",
        chiefComplaint:
          parsed.data.chiefComplaint ?? appt.notes ?? "Appointment",
        status: "WAITING",
        issuedBy: session.user.id,
        expiresAt: tokenExpiryFromNow(),
      },
    });
    await t.appointment.update({
      where: { id: appt.id },
      data: {
        status: "CHECKED_IN",
        tokenId: token.id,
        patientId,
      },
    });
    return NextResponse.json({
      success: true,
      data: { tokenId: token.id, displayToken, patientId },
    });
  }

  if (parsed.data.status) {
    await t.appointment.update({
      where: { id: appt.id },
      data: { status: parsed.data.status },
    });
  }

  return NextResponse.json({ success: true });
}
