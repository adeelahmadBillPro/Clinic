import { z } from "zod";

export const issueTokenSchema = z.object({
  patientId: z.string().min(1, "Pick a patient"),
  doctorId: z.string().min(1, "Pick a doctor"),
  type: z.enum(["OPD", "IPD", "EMERGENCY"], { message: "Pick a visit type" }),
  chiefComplaint: z
    .string()
    .trim()
    .min(2, "Chief complaint is required (min 2 characters)")
    .max(500, "Too long (max 500 characters)"),
  feeAmount: z
    .coerce
    .number()
    .nonnegative("Fee can't be negative")
    .max(1_000_000, "Fee looks too high")
    .optional(),
  paymentMethod: z
    .enum(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"])
    .optional(),
  feePaid: z.boolean().optional(),
  // Receptionist confirms after the multi-doctor warning ("This patient
  // saw Dr. X today — issue another token to Dr. Y?"). Without this flag
  // the API returns 409 with code MULTI_VISIT_CONFIRM and the previous
  // token's metadata.
  acknowledgeMultiVisit: z.boolean().optional(),
});

export type IssueTokenInput = z.infer<typeof issueTokenSchema>;

export const updateTokenSchema = z.object({
  status: z
    .enum(["WAITING", "CALLED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  cancelReason: z.string().max(300).optional(),
});
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
