import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — ClinicOS",
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your clinic workspace.
        </p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to ClinicOS?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Start a free trial
        </Link>
      </p>
    </div>
  );
}
