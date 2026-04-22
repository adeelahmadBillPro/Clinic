import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";

type DaySlot = { start: string; end: string } | null;
type RawSchedule = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  DaySlot
> & { slotMinutes?: number };

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function expandSlots(
  start: string,
  end: string,
  step: number,
): string[] {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out: string[] = [];
  for (let t = startMin; t + step <= endMin; t += step) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  }
  return out;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date");
  if (!dateStr || isNaN(Date.parse(dateStr))) {
    return NextResponse.json(
      { success: false, error: "date (YYYY-MM-DD) required" },
      { status: 400 },
    );
  }
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  // Guard: only allow today + 14 days forward
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 14);
  if (date < today) {
    return NextResponse.json({
      success: true,
      data: { open: false, reason: "Past date", slots: [] },
    });
  }
  if (date > maxDate) {
    return NextResponse.json({
      success: true,
      data: {
        open: false,
        reason: "Beyond 14-day booking window",
        slots: [],
      },
    });
  }

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found" },
      { status: 404 },
    );
  }

  const schedule = (doctor.schedule ?? {}) as RawSchedule;
  const dayKey = DAY_KEYS[date.getDay()];
  const daySlot = schedule[dayKey];
  if (!daySlot) {
    return NextResponse.json({
      success: true,
      data: {
        open: false,
        reason: `Doctor is closed on ${date.toLocaleDateString(undefined, {
          weekday: "long",
        })}`,
        slots: [],
      },
    });
  }

  const slotMinutes = schedule.slotMinutes ?? 30;
  const allSlots = expandSlots(daySlot.start, daySlot.end, slotMinutes);

  // Fetch existing bookings for that date / doctor
  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const t = db(doctor.clinicId);
  const existing = await t.appointment.findMany({
    where: {
      doctorId: id,
      appointmentDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
    select: { timeSlot: true },
  });
  const bookedSet = new Set(existing.map((a) => a.timeSlot));

  // Filter out slots in the past if date === today
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const slots = allSlots.map((time) => {
    const [h, m] = time.split(":").map(Number);
    const isPast =
      isToday && (h < now.getHours() ||
        (h === now.getHours() && m <= now.getMinutes()));
    return {
      time,
      booked: bookedSet.has(time),
      past: isPast,
      available: !bookedSet.has(time) && !isPast,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      open: true,
      slotMinutes,
      dayHours: `${daySlot.start} – ${daySlot.end}`,
      slots,
    },
  });
}
