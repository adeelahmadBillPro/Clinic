"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { stackContainer, stackItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

function friendlyAuthError(code?: string, raw?: string) {
  if (!code && !raw) return "Something went wrong. Please try again.";
  const message = raw ?? "";
  if (message.includes("LOCKED")) return message.split(":")[1]?.trim() || message;
  if (message.includes("INVALID_CREDENTIALS")) {
    return message.split(":")[1]?.trim() || "Invalid email or password";
  }
  if (message.includes("INVALID_INPUT")) return "Invalid email or password";
  return "Invalid email or password";
}

// Only allow callbackUrl values that are same-origin relative paths. Reject
// scheme-relative ("//evil.com"), absolute URLs, and back-references — an
// attacker linking the login page with `?callbackUrl=https://evil.com` could
// otherwise bounce a freshly signed-in user off to a phishing clone.
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/dashboard";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const shake = useAnimationControls();

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    // P4-50: rememberMe dropped — it was collected but never passed to
    // signIn. Bring it back once session-duration logic actually wires up.
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        const msg = friendlyAuthError(res.code, res.error);
        setServerError(msg);
        shake.start("shake");
        return;
      }

      toast.success("Signed in");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
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
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={!!errors.password}
            className={cn("mt-1.5", errors.password && "border-destructive")}
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </motion.div>


        <motion.div variants={stackItem} className="pt-2">
          <SubmitButton loading={submitting} loadingText="Signing you in...">
            Sign in
          </SubmitButton>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
