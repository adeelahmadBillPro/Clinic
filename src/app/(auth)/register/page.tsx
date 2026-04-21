import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Start your free trial — ClinicOS",
  description:
    "Create your clinic workspace and try every Pro feature free for 10 days. No credit card required.",
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Start your free trial
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          10 days of every Pro feature. No card required.
        </p>
      </div>

      <RegisterForm />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
