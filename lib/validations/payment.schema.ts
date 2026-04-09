import { z } from "zod";

export const createPaymentSchema = z.object({
  membership_id: z.string().uuid(),
  payment_mode: z.enum(["cash", "upi"]),
  upi_ref: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

