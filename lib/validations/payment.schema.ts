import { z } from "zod";

export const createPaymentSchema = z.object({
  membership_id: z.string().uuid(),
  payment_mode: z.enum(["cash", "upi"]),
  upi_ref: z
    .string()
    .trim()
    .max(100, "UPI reference is too long (max 100 characters)")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long (max 2000 characters)")
    .optional()
    .or(z.literal("")),
});

/** Same rules as API body fields (no membership_id). */
export const paymentFormSchema = createPaymentSchema.omit({ membership_id: true });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

