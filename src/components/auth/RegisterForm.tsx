"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { SubmitButton } from "@/components/shared/SubmitButton";
import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validations/auth";
import { stackContainer, stackItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const shake = useAnimationControls();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
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

      toast.success("Workspace created — signing you in...");

      const signin = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signin?.error) {
        toast.error("Account created — please sign in manually.");
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
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
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0300-1234567"
              aria-invalid={!!errors.phone}
              className={cn("mt-1.5", errors.phone && "border-destructive")}
              {...register("phone")}
            />
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

        <motion.div variants={stackItem} className="pt-2">
          <SubmitButton loading={submitting} loadingText="Creating your workspace...">
            Start free trial
          </SubmitButton>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            By signing up you agree to our Terms & Privacy. No credit card
            required.
          </p>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
