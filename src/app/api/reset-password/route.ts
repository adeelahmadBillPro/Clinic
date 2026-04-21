import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyOtp } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validations/auth";

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

  const parsed = resetPasswordSchema.safeParse(body);
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

  const { email, otp, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  const invalidMsg = "Invalid or expired reset code";

  if (
    !user ||
    !user.resetOtpHash ||
    !user.resetOtpExpiresAt ||
    user.resetOtpExpiresAt < new Date() ||
    !verifyOtp(otp, user.resetOtpHash)
  ) {
    return NextResponse.json(
      { success: false, error: invalidMsg, field: "otp" },
      { status: 400 },
    );
  }

  const hashed = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetOtpHash: null,
      resetOtpExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return NextResponse.json({
    success: true,
    data: { message: "Password reset successful. Please sign in." },
  });
}
