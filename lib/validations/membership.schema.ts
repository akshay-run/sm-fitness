import { z } from "zod";

export const createMembershipSchema = z.object({
  member_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  fee_charged: z.coerce.number().finite().positive("Fee must be greater than 0"),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

