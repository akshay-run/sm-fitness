import { z } from "zod";

export const createMemberSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
  email: z.string().trim().email("Enter a valid email"), // Made required
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  blood_group: z.string().optional().or(z.literal("")),
  joining_date: z.string().optional().or(z.literal("")),
});

export const updateMemberSchema = createMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
