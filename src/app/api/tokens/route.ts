import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { issueTokenSchema } from "@/lib/validations/token";
import { nextTokenNumber, startOfToday, tokenExpiryFromNow } from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { nextSequence, pad } from "@/lib/counter";
import { getIp } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const doctorId = url.searchParams.get("doctorId");
  const status = url.searchParams.get("status");
  const today = url.searchParams.get("today") !== "false";

  const t = db(session.user.clinicId);
  const where: Record<string, unknown> = {};
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;
  if (today) where.issuedAt = { gte: startOfToday() };

  const tokens = await t.token.findMany({
    where,
    orderBy: [
      // Emergencies float to the top of WAITING
      { status: "asc" },
      { issuedAt: "asc" },
    ],
  });

  const patientIds = Array.from(new Set(tokens.map((t) => t.patientId)));
  const doctorIds = Array.from(new Set(tokens.map((t) => t.doctorId)));
  const [patients, doctors] = await Promise.all([
    t.patient.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        name: true,
        phone: true,
        mrn: true,
        allergies: true,
        gender: true,
      },
    }),
    t.doctor.findMany({ where: { id: { in: doctorIds } } }),
  ]);
  const userIds = doctors.map((d) => d.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const patientById = new Map(patients.map((p) => [p.id, p]));
  const doctorById = new Map(
    doctors.map((d) => [
      d.id,
      {
        id: d.id,
        userId: d.userId,
        specialization: d.specialization,
        roomNumber: d.roomNumber,
        name: users.find((u) => u.id === d.userId)?.name ?? "Doctor",
      },
    ]),
  );

  const data = tokens.map((tk) => {
    const p = patientById.get(tk.patientId);
    const d = doctorById.get(tk.doctorId);
    return {
      id: tk.id,
      tokenNumber: tk.tokenNumber,
      displayToken: tk.displayToken,
      status: tk.status,
      type: tk.type,
      chiefComplaint: tk.chiefComplaint,
      issuedAt: tk.issuedAt.toISOString(),
      expiresAt: tk.expiresAt.toISOString(),
      calledAt: tk.calledAt?.toISOString() ?? null,
      patient: p
        ? {
            id: p.id,
            name: p.name,
            phone: p.phone,
            mrn: p.mrn,
            allergies: p.allergies,
            gender: p.gender,
          }
        : null,
      doctor: d
        ? {
            id: d.id,
            name: d.name,
            specialization: d.specialization,
            roomNumber: d.roomNumber,
          }
        : null,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  // Only reception / nurse / admin can issue tokens — doctors consult,
  // they don't issue queue numbers. Pharmacist / lab tech are blocked.
  const allowedIssuers = ["OWNER", "ADMIN", "RECEPTIONIST", "NURSE"];
  if (!allowedIssuers.includes(session.user.role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Only reception / admin can issue tokens.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = issueTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        field: parsed.error.issues[0]?.path.join("."),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  // Validate patient + doctor
  const [patient, doctor] = await Promise.all([
    t.patient.findUnique({ where: { id: input.patientId } }),
    t.doctor.findUnique({ where: { id: input.doctorId } }),
  ]);
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found", field: "patientId" },
      { status: 404 },
    );
  }
  if (!doctor) {
    return NextResponse.json(
      { success: false, error: "Doctor not found", field: "doctorId" },
      { status: 404 },
    );
  }
  if (!doctor.isAvailable || doctor.status === "OFF_DUTY") {
    return NextResponse.json(
      {
        success: false,
        error: "This doctor is not on duty — pick someone else",
        field: "doctorId",
      },
      { status: 400 },
    );
  }

  // Prevent duplicate active tokens for the same patient (any doctor) today
  const todayStart = startOfToday();
  const existingActive = await t.token.findFirst({
    where: {
      patientId: input.patientId,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
      issuedAt: { gte: todayStart },
    },
    select: {
      id: true,
      displayToken: true,
      status: true,
      doctorId: true,
    },
  });
  if (existingActive) {
    return NextResponse.json(
      {
        success: false,
        error: `This patient already has an active token today: ${existingActive.displayToken} (${existingActive.status.replace("_", " ").toLowerCase()}). Cancel or complete it before issuing a new one.`,
        field: "patientId",
        existingToken: {
          id: existingActive.id,
          displayToken: existingActive.displayToken,
          status: existingActive.status,
          doctorId: existingActive.doctorId,
        },
      },
      { status: 409 },
    );
  }

  const { tokenNumber, displayToken } = await nextTokenNumber(
    clinicId,
    input.doctorId,
  );

  const result = await prisma.$transaction(async (tx) => {
    const token = await tx.token.create({
      data: {
        clinicId,
        tokenNumber,
        displayToken,
        patientId: input.patientId,
        doctorId: input.doctorId,
        type: input.type,
        chiefComplaint: input.chiefComplaint,
        status: "WAITING",
        issuedBy: session.user.id,
        expiresAt: tokenExpiryFromNow(),
      },
    });

    let billId: string | null = null;
    const fee =
      typeof input.feeAmount === "number"
        ? input.feeAmount
        : Number(doctor.consultationFee);
    if (fee > 0) {
      // Atomic sequence — see src/lib/counter.ts.
      const year = new Date().getFullYear();
      const seq = await nextSequence(clinicId, "BILL", tx, year);
      const billNumber = `BL-${year}-${pad(seq, 4)}`;

      const paid = input.feePaid === false ? 0 : fee;
      const bill = await tx.bill.create({
        data: {
          clinicId,
          billNumber,
          patientId: input.patientId,
          // doctorId attribution — see P3-33 and `/api/stats/*`.
          doctorId: doctor.id,
          billType: "OPD" as const,
          items: [
            {
              description: `Consultation — Dr. ${doctor.specialization}`,
              qty: 1,
              unitPrice: fee,
              amount: fee,
            },
          ],
          subtotal: fee,
          discount: 0,
          totalAmount: fee,
          paidAmount: paid,
          balance: fee - paid,
          paymentMethod: input.paymentMethod ?? "CASH",
          status: paid >= fee ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING",
          collectedBy: session.user.id,
        },
      });
      billId = bill.id;
    }

    // In-app notification for the doctor
    await tx.notification.create({
      data: {
        clinicId,
        userId: doctor.userId,
        patientId: input.patientId,
        type: "TOKEN_ASSIGNED",
        channel: "IN_APP",
        message: `${token.displayToken} · ${patient.name} · ${input.chiefComplaint.slice(0, 80)}`,
        status: "PENDING",
      },
    });

    await tx.auditLog.create({
      data: {
        clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        ipAddress: getIp(req),
        action: "TOKEN_ISSUED",
        entityType: "Token",
        entityId: token.id,
        details: {
          display: token.displayToken,
          patient: patient.name,
          doctorId: doctor.id,
          fee,
        },
      },
    });

    return { token, billId };
  });

  revalidatePath("/reception");
  revalidatePath("/doctor");
  revalidatePath("/billing");
  revalidatePath("/dashboard");

  return NextResponse.json({
    success: true,
    data: {
      tokenId: result.token.id,
      displayToken: result.token.displayToken,
      tokenNumber: result.token.tokenNumber,
      expiresAt: result.token.expiresAt.toISOString(),
      billId: result.billId,
    },
  });
}
