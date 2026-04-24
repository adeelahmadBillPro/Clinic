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

/**
 * Return { weekdayIdx, hour, minute } for a Date as observed in the given
 * IANA timezone. Uses Intl.DateTimeFormat to avoid pulling in date-fns-tz
 * just for this one operation — Node's `Intl` has full timezone DB.
 */
function zonedParts(d: Date, tz: string): { weekdayIdx: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { weekdayIdx: map[weekday] ?? 0, hour: hour % 24, minute };
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

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found" },
      { status: 404 },
    );
  }

  // Read clinic timezone — fall back to UTC so a missing setting still
  // produces deterministic output. On Vercel the server runs in UTC, so
  // the previous `date.getDay()` would flip a Karachi Monday into Sunday.
  const clinic = await prisma.clinic.findUnique({
    where: { id: doctor.clinicId },
    select: { settings: true },
  });
  const tz =
    ((clinic?.settings as Record<string, unknown> | null)?.timezone as
      | string
      | undefined) ?? "UTC";

  // Interpret the incoming YYYY-MM-DD as a date in the clinic's timezone.
  // We build a synthetic "noon local" Date to keep us safely in the middle
  // of the day regardless of DST transitions.
  const parts = dateStr.split("-").map(Number);
  const [y, mo, d] = parts;
  if (!y || !mo || !d) {
    return NextResponse.json(
      { success: false, error: "date (YYYY-MM-DD) required" },
      { status: 400 },
    );
  }
  const localNoon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));

  // Today / +14 guard, also in clinic timezone.
  const now = new Date();
  const nowZoned = zonedParts(now, tz);
  const nowDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  if (dateStr < nowDateStr) {
    return NextResponse.json({
      success: true,
      data: { open: false, reason: "Past date", slots: [] },
    });
  }
  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + 14);
  const maxDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maxDate);
  if (dateStr > maxDateStr) {
    return NextResponse.json({
      success: true,
      data: {
        open: false,
        reason: "Beyond 14-day booking window",
        slots: [],
      },
    });
  }

  const schedule = (doctor.schedule ?? {}) as RawSchedule;
  const { weekdayIdx } = zonedParts(localNoon, tz);
  const dayKey = DAY_KEYS[weekdayIdx];
  const daySlot = schedule[dayKey];
  if (!daySlot) {
    return NextResponse.json({
      success: true,
      data: {
        open: false,
        reason: `Doctor is closed on ${dayKey.toUpperCase()}`,
        slots: [],
      },
    });
  }

  const slotMinutes = schedule.slotMinutes ?? 30;
  const allSlots = expandSlots(daySlot.start, daySlot.end, slotMinutes);

  // Bookings for that date in clinic TZ. Build the start/end timestamps
  // that bracket the clinic-local day, then query on those UTC bounds.
  const dayStartUTC = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
  const dayEndUTC = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
  const t = db(doctor.clinicId);
  const existing = await t.appointment.findMany({
    where: {
      doctorId: id,
      appointmentDate: { gte: dayStartUTC, lte: dayEndUTC },
      status: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
    select: { timeSlot: true },
  });
  const bookedSet = new Set(existing.map((a) => a.timeSlot));

  const isToday = dateStr === nowDateStr;
  const slots = allSlots.map((time) => {
    const [h, m] = time.split(":").map(Number);
    const isPast =
      isToday &&
      (h < nowZoned.hour ||
        (h === nowZoned.hour && m <= nowZoned.minute));
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
