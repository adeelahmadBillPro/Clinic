import { z } from "zod";

export const medicineItemSchema = z.object({
  medicineId: z.string().optional(),
  name: z.string().trim().min(1, "Medicine name required"),
  genericName: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  route: z.string().optional(),
  instructions: z.string().optional(),
  qty: z.coerce.number().nonnegative().optional(),
});
export type MedicineItem = z.infer<typeof medicineItemSchema>;

export const diagnosisSchema = z.object({
  code: z.string().optional(),
  description: z.string().trim().min(1),
});
export type DiagnosisItem = z.infer<typeof diagnosisSchema>;

// Physiological bounds. Reject impossible values so typos don't become
// records, and so the BMI calc below can trust its inputs. Error
// messages name the field explicitly because they bubble through the
// API's first-issue toast — without the field name the staff has no
// idea what to fix.
// Doctor-friendly: no blocking bounds. Whatever the doctor measured,
// the system accepts. Only sanity-floor at >= 0 to keep negatives out
// of the chart. Range hints in the UI are guidance, not enforcement.
export const vitalsSchema = z.object({
  bp: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  pulse: z.coerce.number().nonnegative().optional(),
  temperature: z.coerce.number().nonnegative().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  height: z.coerce.number().nonnegative().optional(),
  spO2: z.coerce.number().nonnegative().optional(),
  bloodSugar: z.coerce.number().nonnegative().optional(),
});
export type VitalsInput = z.infer<typeof vitalsSchema>;

export const saveConsultationSchema = z.object({
  tokenId: z.string().min(1),
  vitals: vitalsSchema.optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  diagnoses: z.array(diagnosisSchema).optional(),
  medicines: z.array(medicineItemSchema).optional(),
  prescriptionNotes: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  referredTo: z.string().optional(),
  complete: z.boolean().optional(),
});
export type SaveConsultationInput = z.infer<typeof saveConsultationSchema>;
