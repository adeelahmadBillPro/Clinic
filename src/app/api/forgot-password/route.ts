import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/password";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { maskEmail, passwordResetEmailTemplate, sendEmail } from "@/lib/email";
import { runAfterResponse } from "@/lib/background";

const OTP_TTL_MINUTES = 10;

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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // Account enumeration via timing: the DB write + Resend API call take
  // hundreds of ms when the user exists, and ~0ms when they don't. Push
  // all the work to `after()` so the response time is identical for the
  // enumerator.
  runAfterResponse(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return;

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpHash: otpHash, resetOtpExpiresAt: expiresAt },
    });

    let clinicName: string | undefined;
    if (user.clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: user.clinicId },
        select: { name: true },
      });
      clinicName = clinic?.name;
    }

    const tpl = passwordResetEmailTemplate(otp, clinicName);
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      message: `If an account exists for ${maskEmail(email)}, a reset code has been sent.`,
      maskedEmail: maskEmail(email),
    },
  });
}
