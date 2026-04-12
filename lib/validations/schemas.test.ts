import { createMemberSchema } from "@/lib/validations/member.schema";
import { createMembershipSchema } from "@/lib/validations/membership.schema";
import { createPaymentSchema } from "@/lib/validations/payment.schema";

describe("validation schemas", () => {
  it("validates member required fields", () => {
    const ok = createMemberSchema.safeParse({
      full_name: "Aman Sharma",
      mobile: "9876543210",
      email: "aman@example.com",
      joining_date: "2026-01-15",
    });
    expect(ok.success).toBe(true);
  });

  it("allows empty optional email on member", () => {
    const ok = createMemberSchema.safeParse({
      full_name: "Aman Sharma",
      mobile: "9876543210",
      email: "",
      joining_date: "2026-01-15",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects invalid member email format when provided", () => {
    const bad = createMemberSchema.safeParse({
      full_name: "Aman Sharma",
      mobile: "9876543210",
      email: "not-an-email",
      joining_date: "2026-01-15",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects invalid member mobile", () => {
    const bad = createMemberSchema.safeParse({
      full_name: "Aman",
      mobile: "123",
    });
    expect(bad.success).toBe(false);
  });

  it("validates membership payload", () => {
    const ok = createMembershipSchema.safeParse({
      member_id: "11111111-1111-4111-8111-111111111111",
      plan_id: "22222222-2222-4222-8222-222222222222",
      fee_charged: 1200,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects non-positive fee in membership", () => {
    const bad = createMembershipSchema.safeParse({
      member_id: "11111111-1111-4111-8111-111111111111",
      plan_id: "22222222-2222-4222-8222-222222222222",
      fee_charged: 0,
    });
    expect(bad.success).toBe(false);
  });

  it("validates payment mode and ids", () => {
    const ok = createPaymentSchema.safeParse({
      membership_id: "33333333-3333-4333-8333-333333333333",
      payment_mode: "upi",
      upi_ref: "UTR123",
    });
    expect(ok.success).toBe(true);
  });
});

