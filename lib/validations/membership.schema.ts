import { z } from "zod";

const feeSchema = z.coerce
  .number()
  .refine((n) => Number.isFinite(n), "Please enter the fee amount")
  .positive("Fee must be greater than ₹0")
  .max(99_999, "Maximum fee is ₹99,999");

/** Form sends fee as string; empty → required message before numeric checks. */
const membershipFormFeeSchema = z
  .string()
  .trim()
  .min(1, "Please enter the fee amount")
  .transform((s) => Number(s))
  .refine((n) => Number.isFinite(n), "Please enter the fee amount")
  .refine((n) => n > 0, "Fee must be greater than ₹0")
  .refine((n) => n <= 99_999, "Maximum fee is ₹99,999");

export const createMembershipSchema = z.object({
  member_id: z.string().uuid(),
  plan_id: z.string().uuid("Select a plan"),
  fee_charged: feeSchema,
});

/** Client-side: plan + fee only (member_id added on POST). */
export const membershipFormSchema = z.object({
  plan_id: z.string().uuid("Select a plan"),
  fee_charged: membershipFormFeeSchema,
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
