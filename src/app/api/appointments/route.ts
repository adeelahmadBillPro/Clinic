import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { nameSchema, phoneSchema } from "@/lib/validations/common";

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
  bookedVia: z.enum(["RECEPTION", "ONLINE"]).default("RECEPTION"),
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
  const t = db(session.user.clinicId);
  const where: Record<string, unknown> = {};
  if (from && to)
    where.appointmentDate = { gte: new Date(from), lte: new Date(to) };
  if (doctorId) where.doctorId = doctorId;
  const appts = await t.appointment.findMany({
    where,
    orderBy: { appointmentDate: "asc" },
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
  // Reception-side booking (requires auth)
  const session = await auth();
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
  const appt = await t.appointment.create({
    data: {
      clinicId: session.user.clinicId,
      patientId: parsed.data.patientId ?? null,
      patientName: parsed.data.patientName,
      patientPhone: parsed.data.patientPhone,
      doctorId: parsed.data.doctorId,
      appointmentDate: new Date(parsed.data.appointmentDate),
      timeSlot: parsed.data.timeSlot,
      type: parsed.data.type,
      status: "SCHEDULED",
      notes: parsed.data.notes ?? null,
      bookedVia: parsed.data.bookedVia,
    },
  });
  return NextResponse.json({
    success: true,
    data: { id: appt.id },
  });
}
