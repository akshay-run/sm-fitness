import { z } from "zod";

const bloodGroupSchema = z.enum([
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
]);

const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

export const createMemberSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.preprocess(emptyToUndef, z.enum(["male", "female", "other"]).optional()),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  blood_group: z.preprocess(emptyToUndef, bloodGroupSchema.optional()),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  joining_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Joining date must be a valid date"),
});

export const updateMemberSchema = createMemberSchema
  .partial()
  .extend({
    welcome_wa_sent: z.boolean().optional(),
  });

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
