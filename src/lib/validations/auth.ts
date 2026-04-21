import { z } from "zod";
import { nameSchema, optionalPhoneSchema } from "./common";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long");

const strongPasswordSchema = passwordSchema.refine(
  (pwd) =>
    /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd),
  "Must contain uppercase, lowercase, and a number",
);

export const registerSchema = z
  .object({
    name: nameSchema,
    clinicName: z
      .string()
      .trim()
      .min(2, "Enter your clinic name")
      .max(150, "Too long (max 150)"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: optionalPhoneSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function passwordStrength(pwd: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
} {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;
  return {
    score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4,
    label: labels[Math.min(score, 4)],
  };
}
