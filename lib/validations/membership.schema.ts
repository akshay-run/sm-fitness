import { z } from "zod";

export const createMembershipSchema = z.object({
  member_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  fee_charged: z.coerce
    .number()
    .finite()
    .positive("Fee must be greater than 0")
    .max(99_999, "Fee must be at most 99999"),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

