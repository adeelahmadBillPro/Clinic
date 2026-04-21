import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";

const schema = z.object({
  doctorId: z.string().min(1),
  status: z.enum(["AVAILABLE", "BUSY", "ON_BREAK", "OFF_DUTY"]),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(req: Request) {
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
      { success: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const t = db(session.user.clinicId);
  const doctor = await t.doctor.findUnique({
    where: { id: parsed.data.doctorId },
  });
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found" },
      { status: 404 },
    );
  }

  // Doctors can change their own status; admins can change any.
  const isOwnRecord = doctor.userId === session.user.id;
  const isAdminRole =
    session.user.role === "OWNER" || session.user.role === "ADMIN";
  if (!isOwnRecord && !isAdminRole) {
    return NextResponse.json(
      { success: false, error: "Not allowed" },
      { status: 403 },
    );
  }

  await t.doctor.update({
    where: { id: doctor.id },
    data: {
      status: parsed.data.status,
      isAvailable:
        parsed.data.isAvailable ?? parsed.data.status === "AVAILABLE",
    },
  });

  return NextResponse.json({ success: true });
}
