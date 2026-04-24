import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  profileSchema,
  passwordChangeSchema,
} from "@/lib/validations/profile";

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      photoUrl: true,
    },
  });
  if (!user) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  let doctor = null;
  if (user.role === "DOCTOR") {
    const d = await db(session.user.clinicId).doctor.findFirst({
      where: { userId: user.id },
    });
    if (d) {
      doctor = {
        id: d.id,
        specialization: d.specialization,
        qualification: d.qualification,
        roomNumber: d.roomNumber,
        consultationFee: Number(d.consultationFee),
        experienceYears: d.experienceYears,
        about: d.about,
        languages: d.languages,
        gender: d.gender,
        whatsappNumber: d.whatsappNumber,
        photoUrl: d.photoUrl,
      };
    }
  }

  return NextResponse.json({ success: true, data: { user, doctor } });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, error: first?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Email must remain unique across users
  if (data.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    const clash = await prisma.user.findFirst({
      where: { email: data.email, id: { not: session.user.id } },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 400 },
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      photoUrl: data.photoUrl ?? null,
    },
  });

  if (["DOCTOR", "OWNER", "ADMIN"].includes(session.user.role)) {
    const existing = await db(session.user.clinicId).doctor.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) {
      // Tenant + self predicate so a forged doctor id can't touch
      // another user's profile.
      await prisma.doctor.updateMany({
        where: {
          id: existing.id,
          clinicId: session.user.clinicId,
          userId: session.user.id,
        },
        data: {
          specialization: data.specialization || existing.specialization,
          qualification: data.qualification || existing.qualification,
          roomNumber: data.roomNumber ?? null,
          consultationFee:
            data.consultationFee !== undefined
              ? data.consultationFee
              : existing.consultationFee,
          experienceYears:
            data.experienceYears !== undefined
              ? data.experienceYears
              : existing.experienceYears,
          about: data.about || null,
          languages: data.languages ?? [],
          gender: data.gender || null,
          whatsappNumber: data.whatsappNumber || null,
          photoUrl: data.photoUrl ?? null,
        },
      });
    } else if (data.specialization && data.consultationFee !== undefined) {
      // Owner/admin enabling their doctor side for the first time — require the minimums
      await prisma.doctor.create({
        data: {
          clinicId: session.user.clinicId,
          userId: session.user.id,
          specialization: data.specialization,
          qualification: data.qualification || "—",
          roomNumber: data.roomNumber ?? null,
          consultationFee: data.consultationFee,
          experienceYears: data.experienceYears ?? 0,
          about: data.about || null,
          languages: data.languages ?? [],
          gender: data.gender || null,
          whatsappNumber: data.whatsappNumber || null,
          photoUrl: data.photoUrl ?? null,
          schedule: {},
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = passwordChangeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!user) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Use the shared helpers so rounds stay consistent (BCRYPT_ROUNDS = 12
  // in src/lib/password.ts). Previously this file used rounds=10, giving
  // different password costs depending on which codepath hashed them.
  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
