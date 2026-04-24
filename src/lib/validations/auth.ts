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
    // Optional: solo-doctor fast path
    isDoctor: z.boolean().optional(),
    specialization: z.string().trim().max(100).optional(),
    qualification: z.string().trim().max(200).optional(),
    consultationFee: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((v) =>
        typeof v === "number" && !isNaN(v) ? v : undefined,
      ),
    // P4-51: must tick terms & privacy to create an account.
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "You must accept the Terms to continue"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((d, ctx) => {
    if (d.isDoctor) {
      if (!d.specialization || d.specialization.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["specialization"],
          message: "Enter your specialization",
        });
      }
      if (d.consultationFee === undefined || d.consultationFee < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["consultationFee"],
          message: "Enter your consultation fee",
        });
      }
    }
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterOutput = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
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
