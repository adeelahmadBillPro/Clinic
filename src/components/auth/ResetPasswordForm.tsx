"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { OtpInput } from "@/components/auth/OtpInput";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { stackContainer, stackItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetEmail = searchParams.get("email") ?? "";
  const shake = useAnimationControls();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    control,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      email: presetEmail,
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        const field = body?.field as keyof ResetPasswordInput | undefined;
        if (field) {
          setError(field, {
            type: "server",
            message: body.error ?? "Something went wrong",
          });
        } else {
          toast.error(body?.error ?? "Could not reset password");
        }
        shake.start("shake");
        return;
      }
      toast.success("Password reset — please sign in");
      router.push("/login");
    } catch {
      toast.error("Network error. Please try again.");
      shake.start("shake");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      variants={{
        shake: { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.45 } },
      }}
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
          <Label htmlFor="email">Email</Label>
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
        </motion.div>

        <motion.div variants={stackItem}>
          <Label>6-digit code</Label>
          <div className="mt-1.5">
            <Controller
              control={control}
              name="otp"
              render={({ field }) => (
                <OtpInput value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          {errors.otp && (
            <p className="mt-1 text-xs text-destructive">
              {errors.otp.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={stackItem}>
          <Label htmlFor="password">New password</Label>
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
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
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

        <motion.div variants={stackItem} className="pt-2">
          <SubmitButton loading={submitting} loadingText="Resetting password...">
            Reset password
          </SubmitButton>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
