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

export const vitalsSchema = z.object({
  bp: z.string().optional(),
  pulse: z.coerce.number().int().optional(),
  temperature: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  spO2: z.coerce.number().int().optional(),
  bloodSugar: z.coerce.number().optional(),
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
