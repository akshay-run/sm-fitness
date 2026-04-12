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

const emailOptional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().email("Check this email — it doesn't look right").optional()
);

export const createMemberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(/^[0-9]+$/, "Only numbers allowed")
    .refine((s) => s.length === 10, "Must be exactly 10 digits"),
  email: emailOptional,
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.preprocess(emptyToUndef, z.enum(["male", "female", "other"]).optional()),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  blood_group: z.preprocess(emptyToUndef, bloodGroupSchema.optional()),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  joining_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date"),
});

export const updateMemberSchema = createMemberSchema
  .partial()
  .extend({
    welcome_wa_sent: z.boolean().optional(),
    is_active: z.boolean().optional(),
  });

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
