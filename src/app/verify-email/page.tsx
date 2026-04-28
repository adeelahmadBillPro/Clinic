"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "loading" | "success" | "error";

/**
 * /verify-email?token=... — landing page for the verification link in
 * the signup email. Calls the /api/verify-email endpoint and shows a
 * friendly outcome instead of a JSON dump.
 *
 * Wrapped in Suspense because useSearchParams forces a CSR bailout in
 * Next 14 — without the boundary, `next build` aborts the static prerender.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Loading />
        </Shell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Verification link is missing the token.");
      return;
    }
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/verify-email?token=${encodeURIComponent(token)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (aborted) return;
        if (res.ok && body?.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setError(body?.error ?? "This link is invalid or has expired.");
        }
      } catch {
        if (aborted) return;
        setStatus("error");
        setError("Network error. Please try again.");
      }
    })();
    return () => {
      aborted = true;
    };
  }, [token]);

  return (
    <Shell>
      {status === "loading" && <Loading />}

      {status === "success" && (
        <>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
          >
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
          </motion.div>
          <h1 className="mt-5 text-xl font-semibold">Email verified</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your account is active. You can now sign in.
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 w-full text-base",
            )}
          >
            <MailCheck className="mr-1.5 h-4 w-4" />
            Continue to sign in
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Couldn&rsquo;t verify</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Already verified? Just sign in.
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "mt-6 w-full text-base",
            )}
          >
            Back to sign in
          </Link>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-md items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

function Loading() {
  return (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <h1 className="mt-5 text-xl font-semibold">Verifying...</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Hang tight while we activate your clinic workspace.
      </p>
    </>
  );
}
