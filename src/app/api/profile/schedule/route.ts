import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const daySlot = z
  .object({
    start: z.string().regex(TIME_RE, "HH:MM"),
    end: z.string().regex(TIME_RE, "HH:MM"),
  })
  .nullable();

const bodySchema = z.object({
  schedule: z.object({
    mon: daySlot,
    tue: daySlot,
    wed: daySlot,
    thu: daySlot,
    fri: daySlot,
    sat: daySlot,
    sun: daySlot,
  }),
  slotMinutes: z
    .number()
    .int()
    .refine((v) => [15, 20, 30, 45, 60].includes(v), "Invalid slot length"),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  // Validate start < end for each open day
  for (const [day, slot] of Object.entries(parsed.data.schedule)) {
    if (slot && slot.start >= slot.end) {
      return NextResponse.json(
        {
          success: false,
          error: `${day.toUpperCase()}: start time must be before end time`,
        },
        { status: 400 },
      );
    }
  }

  const existing = await db(session.user.clinicId).doctor.findFirst({
    where: { userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Doctor profile not found. Fill in specialization and fee on My profile first.",
      },
      { status: 400 },
    );
  }

  // Scope by userId + clinicId even though the id came from a tenant-
  // scoped findFirst — keeps the write safe even if the prior read is
  // ever refactored.
  await prisma.doctor.updateMany({
    where: {
      id: existing.id,
      clinicId: session.user.clinicId,
      userId: session.user.id,
    },
    data: {
      schedule: {
        ...parsed.data.schedule,
        slotMinutes: parsed.data.slotMinutes,
      },
    },
  });

  return NextResponse.json({ success: true });
}
