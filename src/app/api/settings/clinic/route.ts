import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      language: z.enum(["en", "ur"]).optional(),
      tokenResetTime: z.string().optional(),
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

  return NextResponse.json({ success: true });
}
