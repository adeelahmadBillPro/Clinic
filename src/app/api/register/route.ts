import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validations/auth";
import { rateLimit, getIp, LIMITS } from "@/lib/rate-limit";
import { sendEmail, verifyEmailTemplate } from "@/lib/email";
import { runAfterResponse } from "@/lib/background";

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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  // Public endpoint; throttle to slow down signup-spray abuse.
  const ip = getIp(req);
  const gate = rateLimit(
    `register:${ip}`,
    LIMITS.REGISTRATIONS_PER_HOUR.max,
    LIMITS.REGISTRATIONS_PER_HOUR.windowMs,
  );
  if (!gate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many registrations from this IP. Try again later.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSec) },
      },
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

  const {
    name,
    clinicName,
    email,
    phone,
    password,
    isDoctor,
    specialization,
    qualification,
    consultationFee,
    acceptTerms,
  } = parsed.data;

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

  // 48 bytes of entropy; stored as a SHA-256 hash so even DB compromise
  // doesn't expose usable links.
  const verifyToken = randomBytes(32).toString("hex");
  const verifyTokenHash = hashToken(verifyToken);

  let user: { id: string } | null = null;
  let clinic: { id: string; slug: string } | null = null;

  try {
    const tx = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          password: hashed,
          role: "OWNER",
          // isActive stays TRUE — `emailVerifiedAt` is the gate. Reason:
          // auth.ts checks `!emailVerifiedAt` first and surfaces the
          // specific "verify your email" prompt; falling back to the
          // isActive check would just say "Invalid email or password",
          // which freshly registered users find confusing. isActive=false
          // is reserved for admin-deactivated accounts.
          isActive: true,
          emailVerifyTokenHash: verifyTokenHash,
          acceptedTermsAt: acceptTerms ? new Date() : null,
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

      if (isDoctor && specialization && consultationFee !== undefined) {
        await tx.doctor.create({
          data: {
            clinicId: createdClinic.id,
            userId: linked.id,
            specialization,
            qualification: qualification || "—",
            consultationFee,
            schedule: {},
            isAvailable: true,
            status: "AVAILABLE",
          },
        });
      }

      return { user: linked, clinic: createdClinic };
    });
    user = tx.user;
    clinic = tx.clinic;
  } catch (err) {
    // Catch the unique-email race — two signups for the same address hit
    // the DB at the same moment and the second one would otherwise blow
    // up as a 500.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists",
          field: "email",
        },
        { status: 409 },
      );
    }
    throw err;
  }

  // Send verification email in the background — any Resend hiccup must
  // not leak timing info about whether the email already existed.
  const origin =
    req.headers.get("origin") ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  const verifyUrl = `${origin}/verify-email?token=${verifyToken}`;
  runAfterResponse(async () => {
    const tmpl = verifyEmailTemplate(verifyUrl, name);
    await sendEmail({ to: email, ...tmpl });
  });

  // Dev convenience: when Resend isn't configured, ship the verification
  // URL back in the response so the UI can show a clickable link right
  // away. In production (RESEND_API_KEY set) this stays undefined — the
  // link must NEVER leak over the wire to random callers, email only.
  const devVerifyUrl = process.env.RESEND_API_KEY ? undefined : verifyUrl;

  return NextResponse.json({
    success: true,
    data: {
      userId: user!.id,
      clinicId: clinic!.id,
      clinicSlug: clinic!.slug,
      trialEndsAt: trialEndsAt.toISOString(),
      needsVerification: true,
      devVerifyUrl,
    },
  });
}
