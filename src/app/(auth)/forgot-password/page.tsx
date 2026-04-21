import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password — ClinicOS",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Forgot your password?
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we&rsquo;ll send you a 6-digit code to reset it.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
