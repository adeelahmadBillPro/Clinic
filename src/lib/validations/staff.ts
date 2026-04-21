import { z } from "zod";
import { nameSchema, optionalPhoneSchema } from "./common";

const ROLE_ENUM = z.enum([
  "OWNER",
  "ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
  "NURSE",
  "PHARMACIST",
  "LAB_TECH",
]);

export const scheduleSchema = z.object({
  mon: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
  tue: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
  wed: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
  thu: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
  fri: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
  sat: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
  sun: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
});

export const addStaffSchema = z
  .object({
    name: nameSchema,
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: optionalPhoneSchema,
    role: ROLE_ENUM,
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(100, "Too long"),
    specialization: z.string().max(100).optional(),
    qualification: z.string().max(200).optional(),
    roomNumber: z.string().trim().max(20, "Room number too long").optional(),
    consultationFee: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((v) => (typeof v === "number" && !isNaN(v) ? v : undefined)),
    revenueSharePct: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((v) => (typeof v === "number" && !isNaN(v) ? v : undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.role === "DOCTOR") {
      if (!data.specialization || data.specialization.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["specialization"],
          message: "Specialization is required for doctors",
        });
      }
      if (!data.qualification || data.qualification.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["qualification"],
          message: "Qualification is required for doctors",
        });
      }
      if (data.consultationFee === undefined || data.consultationFee < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["consultationFee"],
          message: "Consultation fee is required",
        });
      }
      if (
        data.consultationFee !== undefined &&
        data.consultationFee > 1_000_000
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["consultationFee"],
          message: "Fee looks too high",
        });
      }
      if (data.revenueSharePct !== undefined) {
        if (data.revenueSharePct < 0 || data.revenueSharePct > 100) {
          ctx.addIssue({
            code: "custom",
            path: ["revenueSharePct"],
            message: "Revenue share must be 0-100%",
          });
        }
      }
    }
  });

export type AddStaffInput = z.input<typeof addStaffSchema>;
export type AddStaffOutput = z.output<typeof addStaffSchema>;

export const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: nameSchema.optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: optionalPhoneSchema,
  role: ROLE_ENUM.optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  roomNumber: z.string().optional(),
  consultationFee: z.coerce.number().nonnegative().optional(),
  revenueSharePct: z.coerce.number().min(0).max(100).optional(),
});
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
