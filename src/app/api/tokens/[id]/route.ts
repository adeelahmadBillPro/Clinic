import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { updateTokenSchema } from "@/lib/validations/token";
import { sendWhatsApp, tokenCalledMessage } from "@/lib/twilio";
import { runAfterResponse } from "@/lib/background";
import { getIp } from "@/lib/utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const { status, cancelReason } = parsed.data;
  const t = db(session.user.clinicId);
  const token = await t.token.findUnique({ where: { id } });
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Token not found" },
      { status: 404 },
    );
  }

  // Explicit transition matrix. Previously any status write would land
  // (including going back from COMPLETED to WAITING), which corrupted
  // queue metrics and audit trails.
  const VALID_TRANSITIONS: Record<string, string[]> = {
    WAITING: ["CALLED", "CANCELLED", "EXPIRED"],
    CALLED: ["IN_PROGRESS", "WAITING", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    EXPIRED: [],
  };
  if (status && !VALID_TRANSITIONS[token.status]?.includes(status)) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot go from ${token.status} to ${status}`,
      },
      { status: 409 },
    );
  }

  // Role-based status transitions:
  //   - CALLED / CANCELLED: any staff (reception, doctor, admin)
  //   - IN_PROGRESS / COMPLETED: only the doctor handling the token, or
  //     OWNER/ADMIN. Receptionists cannot complete consultations.
  const role = session.user.role;
  if (status === "IN_PROGRESS" || status === "COMPLETED") {
    const isAdmin = role === "OWNER" || role === "ADMIN";
    const isDoctor = role === "DOCTOR";
    if (!isAdmin && !isDoctor) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the doctor (or admin) can start or complete a consultation. Reception can call or cancel.",
        },
        { status: 403 },
      );
    }
  }

  const now = new Date();
  const update: Record<string, unknown> = {};
  if (status) {
    update.status = status;
    if (status === "CALLED" && !token.calledAt) update.calledAt = now;
    if (status === "IN_PROGRESS" && !token.startedAt) update.startedAt = now;
    if (status === "COMPLETED" && !token.completedAt) update.completedAt = now;
    if (status === "CANCELLED") update.cancelReason = cancelReason ?? null;
  }

  const updated = await t.token.update({
    where: { id },
    data: update,
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      ipAddress: getIp(req),
      action:
        status === "CALLED"
          ? "TOKEN_CALLED"
          : status === "COMPLETED"
            ? "TOKEN_COMPLETED"
            : status === "CANCELLED"
              ? "TOKEN_CANCELLED"
              : "TOKEN_UPDATED",
      entityType: "Token",
      entityId: updated.id,
      details: { display: updated.displayToken, status: updated.status },
    },
  });

  // Send WhatsApp notification on CALLED. `after()` keeps the work alive
  // on serverless platforms (Vercel/Lambda kill fire-and-forget IIFEs as
  // soon as the response is sent).
  if (status === "CALLED") {
    const clinicId = session.user.clinicId;
    runAfterResponse(async () => {
        const [patient, doctor, clinic] = await Promise.all([
          t.patient.findUnique({
            where: { id: updated.patientId },
            select: { phone: true, optOutWhatsApp: true },
          }),
          t.doctor.findUnique({
            where: { id: updated.doctorId },
          }),
          prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { name: true },
          }),
        ]);
        // Respect WhatsApp opt-out — if the patient said STOP we simply
        // don't notify. Status is still updated so the display board works.
        if (patient?.phone && !patient.optOutWhatsApp && doctor && clinic) {
          const doctorUser = await prisma.user.findUnique({
            where: { id: doctor.userId },
            select: { name: true },
          });
          const msg = tokenCalledMessage({
            clinicName: clinic.name,
            displayToken: updated.displayToken,
            doctorName: doctorUser?.name ?? "Doctor",
            roomNumber: doctor.roomNumber,
          });
          await sendWhatsApp(patient.phone, msg);
          await t.notification.create({
            data: {
              clinicId,
              patientId: updated.patientId,
              type: "TOKEN_CALLED",
              channel: "WHATSAPP",
              message: msg,
              status: "SENT",
              sentAt: new Date(),
            },
          });
        }
      });
  }

  revalidatePath("/reception");
  revalidatePath("/doctor");
  revalidatePath("/dashboard");

  return NextResponse.json({
    success: true,
    data: { id: updated.id, status: updated.status },
  });
}
