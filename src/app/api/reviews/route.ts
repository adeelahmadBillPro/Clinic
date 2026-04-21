import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nameSchema, optionalPhoneSchema } from "@/lib/validations/common";

const submitSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(5)
    .regex(/^APT-[A-Z0-9]{6}$/i, "Invalid confirmation code"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional().or(z.literal("")),
  reviewerName: nameSchema,
  reviewerPhone: optionalPhoneSchema,
});

function findByConfirmation(confirmation: string) {
  const tail = confirmation.replace(/^APT-/i, "").toLowerCase();
  // The confirmation uses the last 6 chars of the cuid, uppercase.
  return prisma.appointment.findFirst({
    where: { id: { endsWith: tail } },
    select: {
      id: true,
      clinicId: true,
      doctorId: true,
      patientId: true,
      patientPhone: true,
      patientName: true,
      appointmentDate: true,
      status: true,
    },
  });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const appt = await findByConfirmation(data.confirmation);
  if (!appt) {
    return NextResponse.json(
      { success: false, error: "Confirmation code not found" },
      { status: 404 },
    );
  }

  // Only allow review after appointment date (same-day ok)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDay = new Date(appt.appointmentDate);
  apptDay.setHours(0, 0, 0, 0);
  if (apptDay.getTime() > today.getTime()) {
    return NextResponse.json(
      {
        success: false,
        error: "You can leave a review on or after your appointment date",
      },
      { status: 400 },
    );
  }

  const already = await prisma.review.findFirst({
    where: { appointmentId: appt.id },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json(
      { success: false, error: "A review for this appointment already exists" },
      { status: 400 },
    );
  }

  await prisma.review.create({
    data: {
      clinicId: appt.clinicId,
      doctorId: appt.doctorId,
      appointmentId: appt.id,
      patientId: appt.patientId,
      reviewerName: data.reviewerName,
      reviewerPhone: data.reviewerPhone || appt.patientPhone,
      rating: data.rating,
      comment: data.comment || null,
    },
  });

  return NextResponse.json({ success: true });
}
