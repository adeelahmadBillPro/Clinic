import { z } from "zod";
import { phoneSchema, nameSchema, optionalPhoneSchema } from "./common";

export const createPatientSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  gender: z.enum(["M", "F", "Other"], {
    message: "Pick a gender",
  }),
  dob: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => {
      if (!v) return true;
      const d = new Date(v);
      const now = new Date();
      return d <= now && d.getFullYear() >= 1900;
    }, "DOB must be in the past (after 1900)"),
  address: z.string().max(300, "Too long (max 300)").optional(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
    .optional(),
  allergies: z.array(z.string().max(60)).max(20, "Too many allergies").optional(),
  chronicConditions: z
    .array(z.string().max(80))
    .max(20, "Too many conditions")
    .optional(),
  emergencyContact: z
    .string()
    .max(100, "Too long (max 100)")
    .optional(),
  emergencyPhone: optionalPhoneSchema,
  forceCreate: z.boolean().optional(),
  // Optional: issue a token immediately after registration so the patient
  // appears in the doctor's queue in one click.
  autoIssueToken: z.boolean().optional(),
  autoIssueDoctorId: z.string().optional(),
  autoIssueChiefComplaint: z.string().max(200).optional(),
  // Mark the consultation fee as already paid at the counter now.
  // If false (default), bill is created but status = PENDING.
  feePaidNow: z.boolean().optional(),
  paymentMethod: z
    .enum(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"])
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const searchPatientsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});
