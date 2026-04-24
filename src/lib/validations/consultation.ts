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
// records, and so the BMI calc below can trust its inputs.
export const vitalsSchema = z.object({
  bp: z
    .string()
    .trim()
    .regex(/^\d{2,3}\/\d{2,3}$/, "BP like 120/80")
    .optional()
    .or(z.literal("")),
  pulse: z.coerce.number().int().min(30).max(250).optional(),
  temperature: z.coerce.number().min(30).max(45).optional(),
  weight: z.coerce.number().min(0.5).max(500).optional(),
  height: z.coerce.number().min(30).max(260).optional(),
  spO2: z.coerce.number().int().min(50).max(100).optional(),
  bloodSugar: z.coerce.number().min(20).max(800).optional(),
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
