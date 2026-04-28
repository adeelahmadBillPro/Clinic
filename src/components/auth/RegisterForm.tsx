"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { SubmitButton } from "@/components/shared/SubmitButton";
import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validations/auth";
import { stackContainer, stackItem } from "@/lib/motion";
import { useEnterTabsForward } from "@/lib/hooks/useEnterTabsForward";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const shake = useAnimationControls();
  const [submitting, setSubmitting] = useState(false);
  const handleEnterTab = useEnterTabsForward();
  // After P2-14, the user lands with `emailVerifiedAt: null` until they
  // click the verification link. Auto-signin would bounce off the verify
  // gate, so we swap the form for a "check your email" panel.
  // `devVerifyUrl` is populated by the register API only in dev (no
  // RESEND_API_KEY set) — in prod it stays undefined and the user goes
  // through the real email.
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    devVerifyUrl?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      clinicName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const password = watch("password");

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.success) {
        const field = body?.field as keyof RegisterInput | undefined;
        if (field) {
          setError(field, {
            type: "server",
            message: body.error ?? "Something went wrong",
          });
        } else {
          toast.error(body?.error ?? "Could not create your account");
        }
        shake.start("shake");
        return;
      }

      // Auto-signin would just bounce off the email-not-verified gate;
      // show the "check your email" panel instead.
      toast.success("Workspace created — check your email to verify.");
      setPendingVerification({
        email: values.email,
        devVerifyUrl: body?.data?.devVerifyUrl,
      });
    } catch {
      toast.error("Network error. Please try again.");
      shake.start("shake");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingVerification) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">
              {pendingVerification.email}
            </span>
            . Click it to activate your clinic, then come back to sign in.
          </p>
        </div>
        {pendingVerification.devVerifyUrl ? (
          <div className="space-y-2 rounded-lg border-2 border-dashed border-amber-400/60 bg-amber-50/70 p-3 text-left dark:bg-amber-950/30">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Dev mode — Resend not configured
            </div>
            <p className="text-xs text-amber-900">
              No real email was sent. Click the link below to verify your
              account right now:
            </p>
            <Link
              href={pendingVerification.devVerifyUrl}
              className="block truncate rounded-md bg-white px-2 py-1.5 font-mono text-[11px] text-primary underline-offset-2 hover:underline dark:bg-amber-950/50"
            >
              {pendingVerification.devVerifyUrl}
            </Link>
          </div>
        ) : (
          <div className="rounded-md border bg-muted/30 p-3 text-left text-xs text-muted-foreground">
            <strong className="text-foreground">No email?</strong> Check your
            spam folder, and make sure the address is correct.
          </div>
        )}
        <Link
          href="/login"
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92"
        >
          I&rsquo;ve verified — go to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={handleEnterTab}
      variants={{
        ...stackContainer,
        shake: { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.45 } },
      }}
      initial="initial"
      animate={shake}
      className="space-y-4"
    >
      <motion.div
        variants={stackContainer}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        <motion.div variants={stackItem}>
          <Label htmlFor="name">Your full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Dr. Aisha Ahmad"
            aria-invalid={!!errors.name}
            className={cn("mt-1.5", errors.name && "border-destructive")}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </motion.div>

        <motion.div variants={stackItem}>
          <Label htmlFor="clinicName">Clinic name</Label>
          <Input
            id="clinicName"
            autoComplete="organization"
            placeholder="HomeLiving Dream Clinic"
            aria-invalid={!!errors.clinicName}
            className={cn("mt-1.5", errors.clinicName && "border-destructive")}
            {...register("clinicName")}
          />
          {errors.clinicName && (
            <p className="mt-1 text-xs text-destructive">
              {errors.clinicName.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={stackItem} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@clinic.com"
              aria-invalid={!!errors.email}
              className={cn("mt-1.5", errors.email && "border-destructive")}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">
              Phone{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className={cn("mt-1.5", errors.phone && "[&_input]:border-destructive")}>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="300 1234567"
                    autoComplete="tel"
                  />
                )}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-xs text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div variants={stackItem}>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="8+ characters, mix letters & numbers"
            aria-invalid={!!errors.password}
            className={cn("mt-1.5", errors.password && "border-destructive")}
            {...register("password")}
          />
          <PasswordStrengthMeter value={password} />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={stackItem}>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            aria-invalid={!!errors.confirmPassword}
            className={cn(
              "mt-1.5",
              errors.confirmPassword && "border-destructive",
            )}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={stackItem} className="rounded-xl border bg-muted/30 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              {...register("isDoctor")}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">
                I&rsquo;m also a practicing doctor
              </div>
              <div className="text-xs text-muted-foreground">
                We&rsquo;ll set up your doctor profile so patients can book you and
                tokens route to your queue instantly.
              </div>
            </div>
          </label>

          {watch("isDoctor") && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g. Dermatologist"
                  className={cn(
                    "mt-1.5",
                    errors.specialization && "border-destructive",
                  )}
                  {...register("specialization")}
                />
                {errors.specialization && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.specialization.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="MBBS, FCPS"
                  className="mt-1.5"
                  {...register("qualification")}
                />
              </div>
              <div>
                <Label htmlFor="consultationFee">Consultation fee (₨)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  min={0}
                  placeholder="1500"
                  className={cn(
                    "mt-1.5",
                    errors.consultationFee && "border-destructive",
                  )}
                  {...register("consultationFee", { valueAsNumber: true })}
                />
                {errors.consultationFee && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.consultationFee.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={stackItem} className="pt-1">
          {/* P4-51: hard-required T&C acceptance — the server also rejects
              submissions without it, this is the first line of defence. */}
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              {...register("acceptTerms")}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-primary"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I accept the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="mt-1 text-xs text-destructive">
              {errors.acceptTerms.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={stackItem} className="pt-2">
          <SubmitButton loading={submitting} loadingText="Creating your workspace...">
            Start free trial
          </SubmitButton>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No credit card required.
          </p>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
