import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { db } from "@/lib/tenant-db";
import { getIp } from "@/lib/utils";
import { z } from "zod";

// Reject bogus IANA timezone strings — a typo like "Asia/Karach" would
// silently propagate into slots / tokens / billing date arithmetic.
const timezoneSchema = z
  .string()
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Unknown timezone" },
  );

// HH:MM 00:00–23:59. Token reset time drives the daily counter rollover,
// so unchecked input like "24:01" would break queue ordering.
const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

const schema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  settings: z
    .object({
      timezone: timezoneSchema.optional(),
      language: z.enum(["en", "ur"]).optional(),
      tokenResetTime: timeOfDaySchema.optional(),
      currency: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
      { status: 403 },
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

  const current = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
  });
  if (!current) {
    return NextResponse.json(
      { success: false, error: "Clinic not found" },
      { status: 404 },
    );
  }

  const mergedSettings =
    parsed.data.settings !== undefined
      ? {
          ...((current.settings as Record<string, unknown>) ?? {}),
          ...parsed.data.settings,
        }
      : undefined;

  await prisma.clinic.update({
    where: { id: current.id },
    data: {
      name: parsed.data.name ?? current.name,
      phone: parsed.data.phone ?? current.phone,
      address: parsed.data.address ?? current.address,
      ...(mergedSettings ? { settings: mergedSettings } : {}),
    },
  });

  // Audit log — settings changes affect how the whole clinic behaves, so
  // we want a trail of who flipped what.
  await db(session.user.clinicId).auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action: "CLINIC_SETTINGS_UPDATED",
      entityType: "Clinic",
      entityId: current.id,
      details: {
        fields: Object.keys(parsed.data),
        settingsKeys: parsed.data.settings
          ? Object.keys(parsed.data.settings)
          : [],
      },
    },
  });

  return NextResponse.json({ success: true });
}
