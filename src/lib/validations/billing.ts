import { z } from "zod";

export const billItemSchema = z.object({
  description: z.string().trim().min(1),
  qty: z.coerce.number().nonnegative().default(1),
  unitPrice: z.coerce.number().nonnegative(),
});
export type BillItem = z.infer<typeof billItemSchema>;

export const createBillSchema = z
  .object({
    patientId: z.string().min(1),
    billType: z.enum(["OPD", "PHARMACY", "LAB", "IPD"]).default("OPD"),
    items: z.array(billItemSchema).min(1, "Add at least one item"),
    discount: z.coerce.number().nonnegative().default(0),
    discountReason: z.string().optional(),
    paymentMethod: z
      .enum(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"])
      .default("CASH"),
    insuranceInfo: z
      .object({
        company: z.string().optional(),
        policyNo: z.string().optional(),
        coveragePct: z.coerce.number().min(0).max(100).optional(),
      })
      .optional(),
    paidAmount: z.coerce.number().nonnegative().default(0),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discount > 0 && !data.discountReason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["discountReason"],
        message: "Discount reason is required",
      });
    }
  });

export type CreateBillInput = z.infer<typeof createBillSchema>;
