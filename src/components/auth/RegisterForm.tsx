"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

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
