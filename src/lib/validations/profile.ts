import { z } from "zod";
import { nameSchema, optionalPhoneSchema } from "./common";

export const profileSchema = z
  .object({
    name: nameSchema,
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: optionalPhoneSchema,
    // After P1-5 uploads go through Cloudinary; reject anything that
    // doesn't look like a Cloudinary URL so a malicious PATCH can't point
    // photoUrl at an attacker-controlled origin (which would then render
    // inline in the dashboard).
    photoUrl: z
      .string()
      .max(1000)
      .regex(
        /^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\//i,
        "Invalid photo URL",
      )
      .optional()
      .nullable(),

    // Doctor-only (ignored for other roles)
    specialization: z.string().trim().max(100).optional(),
    qualification: z.string().trim().max(200).optional(),
    roomNumber: z.string().trim().max(20).optional(),
    consultationFee: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((v) =>
        typeof v === "number" && !isNaN(v) ? v : undefined,
      ),
    experienceYears: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((v) =>
        typeof v === "number" && !isNaN(v) ? Math.min(60, Math.max(0, Math.floor(v))) : undefined,
      ),
    about: z.string().trim().max(1000).optional(),
    languages: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    gender: z
      .enum(["Male", "Female", "Other"])
      .optional()
      .or(z.literal("")),
    whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  });

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileOutput = z.output<typeof profileSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter current password"),
  newPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/\d/, "Include a number"),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
