"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/SubmitButton";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ email: string; masked: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not send reset code");
        return;
      }
      setSent({ email: values.email, masked: body.data?.maskedEmail ?? values.email });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-5"
        >
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MailCheck className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Check your email</div>
              <p className="mt-1 text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">
                  {sent.masked}
                </span>
                , a 6-digit reset code has been sent. The code expires in 10
                minutes.
              </p>
            </div>
          </div>

          <SubmitButton
            type="button"
            onClick={() =>
              router.push(
                `/reset-password?email=${encodeURIComponent(sent.email)}`,
              )
            }
          >
            Enter reset code
          </SubmitButton>

          <button
            type="button"
            onClick={() => setSent(null)}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Used a different email? Try again
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-4"
        >
          <div>
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
          </div>

          <div className="pt-2">
            <SubmitButton loading={submitting} loadingText="Sending code...">
              Send reset code
            </SubmitButton>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
