import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";
import { addStaffSchema } from "@/lib/validations/staff";

export async function GET() {
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

  const users = await prisma.user.findMany({
    where: { clinicId: session.user.clinicId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const doctorProfiles = await db(session.user.clinicId).doctor.findMany({
    select: {
      id: true,
      userId: true,
      specialization: true,
      qualification: true,
      roomNumber: true,
      consultationFee: true,
      isAvailable: true,
      status: true,
      revenueSharePct: true,
    },
  });

  const byUserId = new Map(doctorProfiles.map((d) => [d.userId, d]));
  const data = users.map((u) => {
    const d = byUserId.get(u.id);
    return {
      ...u,
      consultationFee: d ? Number(d.consultationFee) : null,
      revenueSharePct: d ? Number(d.revenueSharePct) : null,
      specialization: d?.specialization ?? null,
      qualification: d?.qualification ?? null,
      roomNumber: d?.roomNumber ?? null,
      isAvailable: d?.isAvailable ?? null,
      status: d?.status ?? null,
      doctorId: d?.id ?? null,
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
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
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

  const parsed = addStaffSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: first?.message ?? "Invalid input",
        field: first?.path.join("."),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "A user with this email already exists",
        field: "email",
      },
      { status: 409 },
    );
  }

  const clinicId = session.user.clinicId;
  const hashed = await hashPassword(data.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        password: hashed,
        role: data.role,
        clinicId,
      },
    });

    let doctorId: string | null = null;
    if (data.role === "DOCTOR") {
      const doctor = await tx.doctor.create({
        data: {
          clinicId,
          userId: user.id,
          specialization: data.specialization ?? "",
          qualification: data.qualification ?? "",
          roomNumber: data.roomNumber || null,
          consultationFee: data.consultationFee ?? 0,
          revenueSharePct: data.revenueSharePct ?? 0,
          schedule: defaultSchedule(),
        },
      });
      doctorId = doctor.id;
    }

    await tx.auditLog.create({
      data: {
        clinicId,
        userId: session.user.id,
        userName: session.user.name ?? "User",
        action: "STAFF_ADDED",
        entityType: "User",
        entityId: user.id,
        details: { role: data.role, email: data.email },
      },
    });

    return { userId: user.id, doctorId };
  });

  return NextResponse.json({ success: true, data: result });
}

function defaultSchedule() {
  const daily = { start: "09:00", end: "17:00" };
  return {
    mon: daily,
    tue: daily,
    wed: daily,
    thu: daily,
    fri: daily,
    sat: daily,
    sun: null,
  };
}
