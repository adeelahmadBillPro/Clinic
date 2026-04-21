import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validations/auth";

const TRIAL_DAYS = 10;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "clinic";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i}`;
    const existing = await prisma.clinic.findUnique({
      where: { slug: candidate },
    });
    if (!existing) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
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

  const { name, clinicName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "An account with this email already exists",
        field: "email",
      },
      { status: 409 },
    );
  }

  const proPlan = await prisma.plan.findUnique({ where: { name: "PRO" } });
  if (!proPlan) {
    return NextResponse.json(
      {
        success: false,
        error: "Plans not configured. Run `npm run db:seed`.",
      },
      { status: 500 },
    );
  }

  const hashed = await hashPassword(password);
  const slug = await uniqueSlug(clinicName);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { user, clinic } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashed,
        role: "OWNER",
      },
    });
    const createdClinic = await tx.clinic.create({
      data: {
        name: clinicName,
        slug,
        phone: phone || null,
        ownerId: createdUser.id,
        planId: proPlan.id,
        trialEndsAt,
        settings: {
          timezone: "Asia/Karachi",
          language: "en",
          tokenResetTime: "00:00",
          currency: "PKR",
        },
      },
    });
    const linked = await tx.user.update({
      where: { id: createdUser.id },
      data: { clinicId: createdClinic.id },
    });
    await tx.subscription.create({
      data: {
        clinicId: createdClinic.id,
        planId: proPlan.id,
        status: "trialing",
        currentPeriodEnd: trialEndsAt,
      },
    });
    return { user: linked, clinic: createdClinic };
  });

  return NextResponse.json({
    success: true,
    data: {
      userId: user.id,
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      trialEndsAt: trialEndsAt.toISOString(),
    },
  });
}
