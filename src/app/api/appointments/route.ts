import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { z } from "zod";
import { nameSchema, phoneSchema } from "@/lib/validations/common";
import { requireApiRole } from "@/lib/api-guards";
import { runAfterResponse } from "@/lib/background";
import {
  sendWhatsApp,
  appointmentConfirmationMessage,
} from "@/lib/twilio";

const schema = z.object({
  patientId: z.string().optional(),
  patientName: nameSchema,
  patientPhone: phoneSchema,
  doctorId: z.string().min(1, "Pick a doctor"),
  appointmentDate: z
    .string()
    .min(1, "Pick a date")
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => {
      const d = new Date(v);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return d >= todayStart;
    }, "Appointment date can't be in the past"),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, "Pick a valid time"),
  type: z
    .enum(["FIRST_VISIT", "FOLLOW_UP", "CHECKUP"])
    .default("FIRST_VISIT"),
  notes: z.string().max(500, "Too long (max 500)").optional(),
  bookedVia: z.enum(["RECEPTION", "ONLINE", "PHONE"]).default("RECEPTION"),
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
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const doctorId = url.searchParams.get("doctorId");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim();
  const t = db(session.user.clinicId);
  const where: Record<string, unknown> = {};
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.appointmentDate = range;
  }
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { patientName: { contains: q, mode: "insensitive" } },
      { patientPhone: { contains: q } },
    ];
  }
  const appts = await t.appointment.findMany({
    where,
    orderBy: [{ appointmentDate: "asc" }, { timeSlot: "asc" }],
    take: 200,
  });
  return NextResponse.json({
    success: true,
    data: appts.map((a) => ({
      ...a,
      appointmentDate: a.appointmentDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  // Reception-side booking — receptionists + doctors (self-block) + admins.
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
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const t = db(session.user.clinicId);

  // Confirm the FKs actually live in this clinic — `db(clinicId)` scopes
  // reads, so a cross-tenant ID resolves to null here.
  const doctor = await t.doctor.findUnique({
    where: { id: parsed.data.doctorId },
  });
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found", field: "doctorId" },
      { status: 404 },
    );
  }
  if (parsed.data.patientId) {
    const patient = await t.patient.findUnique({
      where: { id: parsed.data.patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found", field: "patientId" },
        { status: 404 },
      );
    }
  }

  const apptDay = new Date(parsed.data.appointmentDate);
  const dayStart = new Date(apptDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(apptDay);
  dayEnd.setHours(23, 59, 59, 999);
  const clash = await t.appointment.findFirst({
    where: {
      doctorId: parsed.data.doctorId,
      appointmentDate: { gte: dayStart, lte: dayEnd },
      timeSlot: parsed.data.timeSlot,
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
  });
  if (clash) {
    return NextResponse.json(
      {
        success: false,
        error: "This slot is already booked. Pick another.",
      },
      { status: 409 },
    );
  }

  // The DB-level partial unique index is the authoritative slot lock —
  // the pre-check above is a friendly fast-path, this catches the race.
  let appt;
  try {
    appt = await t.appointment.create({
      data: {
        clinicId: session.user.clinicId,
        patientId: parsed.data.patientId ?? null,
        patientName: parsed.data.patientName,
        patientPhone: parsed.data.patientPhone,
        doctorId: parsed.data.doctorId,
        appointmentDate: apptDay,
        timeSlot: parsed.data.timeSlot,
        type: parsed.data.type,
        status: "SCHEDULED",
        notes: parsed.data.notes ?? null,
        bookedVia: parsed.data.bookedVia,
      },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "This slot was just booked by someone else. Pick another.",
        },
        { status: 409 },
      );
    }
    throw err;
  }

  revalidatePath("/appointments");
  revalidatePath("/reception");

  // Fire-and-forget WhatsApp confirmation. Respect opt-out for linked
  // patients; walk-ins (no patientId) don't have an opt-out flag and
  // implicitly consent by booking.
  const clinicId = session.user.clinicId;
  const createdAppt = appt;
  runAfterResponse(async () => {
    if (!createdAppt.patientPhone) return;
    if (createdAppt.patientId) {
      const patient = await db(clinicId).patient.findUnique({
        where: { id: createdAppt.patientId },
        select: { optOutWhatsApp: true },
      });
      if (patient?.optOutWhatsApp) return;
    }
    const [doctor, clinic] = await Promise.all([
      db(clinicId).doctor.findUnique({
        where: { id: createdAppt.doctorId },
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
    const msg = appointmentConfirmationMessage({
      clinicName: clinic.name,
      patientName: createdAppt.patientName,
      doctorName: doctorUser?.name ?? "your doctor",
      date: createdAppt.appointmentDate,
      timeSlot: createdAppt.timeSlot,
    });
    await sendWhatsApp(createdAppt.patientPhone, msg);
    await db(clinicId).notification.create({
      data: {
        clinicId,
        patientId: createdAppt.patientId ?? null,
        type: "APPOINTMENT_CONFIRMED",
        channel: "WHATSAPP",
        message: msg,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      id: appt.id,
      confirmation: `APT-${appt.id.slice(-6).toUpperCase()}`,
    },
  });
}
