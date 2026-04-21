import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password — ClinicOS",
};

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Set a new password
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code we sent to your email and pick a new password.
        </p>
      </div>

      <Suspense>
        <ResetPasswordForm />
      </Suspense>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
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
