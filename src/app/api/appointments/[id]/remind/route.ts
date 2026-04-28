import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { requireApiRole } from "@/lib/api-guards";
import { runAfterResponse } from "@/lib/background";
import {
  sendWhatsApp,
  appointmentReminderMessage,
} from "@/lib/twilio";

/**
 * Manual WhatsApp reminder for a single appointment. Idempotent at the
 * UI level (button stays clickable so reception can re-send if the
 * patient asks); a separate notification row is logged each time so
 * audit trail is honest about how many messages went out.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await requireApiRole([
    "OWNER",
    "ADMIN",
    "RECEPTIONIST",
    "DOCTOR",
  ]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  const appt = await t.appointment.findUnique({ where: { id } });
  if (!appt) {
    return NextResponse.json(
      { success: false, error: "Appointment not found" },
      { status: 404 },
    );
  }
  if (!appt.patientPhone) {
    return NextResponse.json(
      { success: false, error: "No phone number on this appointment" },
      { status: 400 },
    );
  }
  // Reception/doctor are also allowed to skip the opt-out for STOPped
  // patients? No — STOP is binding. Surface a friendly error so the user
  // knows nothing went out.
  if (appt.patientId) {
    const patient = await t.patient.findUnique({
      where: { id: appt.patientId },
      select: { optOutWhatsApp: true },
    });
    if (patient?.optOutWhatsApp) {
      return NextResponse.json(
        {
          success: false,
          error: "Patient has opted out of WhatsApp messages",
        },
        { status: 400 },
      );
    }
  }

  runAfterResponse(async () => {
    const [doctor, clinic] = await Promise.all([
      t.doctor.findUnique({
        where: { id: appt.doctorId },
        select: { userId: true },
      }),
      prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true },
      }),
    ]);
    if (!doctor || !clinic) return;
    const doctorUser = await prisma.user.findUnique({
      where: { id: doctor.userId },
      select: { name: true },
    });
    const msg = appointmentReminderMessage({
      clinicName: clinic.name,
      doctorName: doctorUser?.name ?? "your doctor",
      date: appt.appointmentDate,
      timeSlot: appt.timeSlot,
    });
    await sendWhatsApp(appt.patientPhone, msg);
    await t.notification.create({
      data: {
        clinicId,
        patientId: appt.patientId ?? null,
        type: "APPOINTMENT_REMINDER",
        channel: "WHATSAPP",
        message: msg,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  });

  return NextResponse.json({ success: true });
}
