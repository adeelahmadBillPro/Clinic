import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { updateTokenSchema } from "@/lib/validations/token";
import { sendWhatsApp, tokenCalledMessage } from "@/lib/twilio";

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

  // Send WhatsApp notification on CALLED
  if (status === "CALLED") {
    // Don't block the response on notification send
    (async () => {
      try {
        const [patient, doctor, clinic] = await Promise.all([
          t.patient.findUnique({
            where: { id: updated.patientId },
            select: { phone: true },
          }),
          t.doctor.findUnique({
            where: { id: updated.doctorId },
          }),
          prisma.clinic.findUnique({
            where: { id: session.user.clinicId! },
            select: { name: true },
          }),
        ]);
        if (patient?.phone && doctor && clinic) {
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
              clinicId: session.user.clinicId!,
              patientId: updated.patientId,
              type: "TOKEN_CALLED",
              channel: "WHATSAPP",
              message: msg,
              status: "SENT",
              sentAt: new Date(),
            },
          });
        }
      } catch (e) {
        console.error("[token-called notify] failed", e);
      }
    })();
  }

  return NextResponse.json({
    success: true,
    data: { id: updated.id, status: updated.status },
  });
}
