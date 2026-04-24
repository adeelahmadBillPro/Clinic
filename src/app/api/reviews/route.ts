import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nameSchema, optionalPhoneSchema } from "@/lib/validations/common";
import { rateLimit, getIp, LIMITS } from "@/lib/rate-limit";

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
  // Public endpoint — bucket per IP to blunt casual abuse.
  const ip = getIp(req);
  const gate = rateLimit(
    `reviews:${ip}`,
    LIMITS.REVIEWS_PER_HOUR.max,
    LIMITS.REVIEWS_PER_HOUR.windowMs,
  );
  if (!gate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many reviews from this IP. Try again later.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSec) },
      },
    );
  }

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

  // Only COMPLETED appointments can be reviewed. Prevents trolling by
  // no-show patients and spammers who guess confirmation codes for future
  // appointments.
  if (appt.status !== "COMPLETED") {
    return NextResponse.json(
      {
        success: false,
        error: "Reviews open once the appointment is marked completed",
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
      // Stays in moderation queue until an admin publishes — see
      // /api/reviews/[id]/publish and /reject.
    },
  });

  return NextResponse.json({ success: true });
}
