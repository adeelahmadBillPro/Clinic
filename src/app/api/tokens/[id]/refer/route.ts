import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { nextTokenNumber, tokenExpiryFromNow } from "@/lib/token";

const schema = z.object({
  toDoctorId: z.string().min(1, "Pick a doctor"),
  notes: z.string().max(500).optional(),
  chiefComplaint: z.string().max(500).optional(),
});

export async function POST(
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);
  const token = await t.token.findUnique({ where: { id } });
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Token not found" },
      { status: 404 },
    );
  }

  if (parsed.data.toDoctorId === token.doctorId) {
    return NextResponse.json(
      { success: false, error: "Cannot refer to the same doctor" },
      { status: 400 },
    );
  }

  const toDoctor = await t.doctor.findUnique({
    where: { id: parsed.data.toDoctorId },
  });
  if (!toDoctor) {
    return NextResponse.json(
      { success: false, error: "Target doctor not found" },
      { status: 404 },
    );
  }
  if (!toDoctor.isAvailable || toDoctor.status === "OFF_DUTY") {
    return NextResponse.json(
      { success: false, error: "That doctor is not on duty right now" },
      { status: 400 },
    );
  }

  // Get the original doctor's name so we can tag the new token's chief complaint
  const fromDoctor = await t.doctor.findUnique({
    where: { id: token.doctorId },
  });
  const fromDoctorUser = fromDoctor
    ? await prisma.user.findUnique({
        where: { id: fromDoctor.userId },
        select: { name: true },
      })
    : null;
  const fromName = fromDoctorUser?.name ?? "another doctor";

  const { tokenNumber, displayToken } = await nextTokenNumber(
    clinicId,
    parsed.data.toDoctorId,
  );

  const patient = await t.patient.findUnique({
    where: { id: token.patientId },
    select: { name: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    // Mark original token completed
    await tx.token.update({
      where: { id: token.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Update/create consultation referral link if a consultation exists
    const existing = await tx.consultation.findFirst({
      where: { clinicId, tokenId: token.id },
    });
    if (existing) {
      await tx.consultation.update({
        where: { id: existing.id },
        data: { referredTo: parsed.data.toDoctorId },
      });
    }

    // Create new token for the referred doctor
    const complaint =
      parsed.data.chiefComplaint ||
      `${token.chiefComplaint ?? "Referral"} · Referred from ${fromName}`;
    const newToken = await tx.token.create({
      data: {
        clinicId,
        tokenNumber,
        displayToken,
        patientId: token.patientId,
        doctorId: parsed.data.toDoctorId,
        type: token.type,
        chiefComplaint: complaint,
        status: "WAITING",
        issuedBy: session.user.id,
        expiresAt: tokenExpiryFromNow(),
      },
    });

    // Notify the target doctor
    await tx.notification.create({
      data: {
        clinicId,
        userId: toDoctor.userId,
        patientId: token.patientId,
        type: "TOKEN_REFERRED",
        channel: "IN_APP",
        message: `${newToken.displayToken} · ${patient?.name ?? "Patient"} · Referred from ${fromName}${parsed.data.notes ? ` — ${parsed.data.notes}` : ""}`,
        status: "PENDING",
      },
    });

    await tx.auditLog.create({
      data: {
        clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: "PATIENT_REFERRED",
        entityType: "Token",
        entityId: newToken.id,
        details: {
          fromTokenId: token.id,
          toDoctorId: parsed.data.toDoctorId,
          notes: parsed.data.notes,
        },
      },
    });

    return { newTokenId: newToken.id, displayToken: newToken.displayToken };
  });

  return NextResponse.json({ success: true, data: result });
}
