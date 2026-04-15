vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

vi.mock("@/lib/gymDisplay", () => ({
  getGymDisplay: vi.fn(async () => ({
    gym_name: "SM FITNESS",
    address: null,
    phone: null,
    logo_signed_url: null,
    whatsapp_group_link: null,
  })),
}));

let relationShape: "array" | "object" = "array";

function makePaymentRow() {
  const memberObj = {
    id: "member-1",
    full_name: "Aman",
    member_code: "GYM-001",
    mobile: "9999999999",
    welcome_wa_sent: false,
  };
  const membershipObj = {
    id: "membership-1",
    plan_id: "plan-1",
    start_date: "2026-04-01",
    end_date: "2026-05-01",
    plans: relationShape === "array" ? [{ name: "Monthly" }] : { name: "Monthly" },
  };

  return {
    id: "payment-1",
    membership_id: "membership-1",
    member_id: "member-1",
    amount: 700,
    payment_mode: "cash" as const,
    payment_date: "2026-04-15",
    upi_ref: null,
    receipt_number: "RCP-2026-0001",
    email_sent: true,
    notes: null,
    created_at: "2026-04-15T10:00:00.000Z",
    members: relationShape === "array" ? [memberObj] : memberObj,
    memberships: relationShape === "array" ? [membershipObj] : membershipObj,
  };
}

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table !== "payments") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: makePaymentRow(),
              error: null,
            }),
          }),
        }),
      };
    },
  }),
}));

describe("GET /api/payments/[id]", () => {
  it("supports array-shaped relation payloads", async () => {
    relationShape = "array";
    const { GET } = await import("@/app/api/payments/[id]/route");

    const res = await GET(new Request("http://localhost/api/payments/payment-1"), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.member?.full_name).toBe("Aman");
    expect(json.membership?.start_date).toBe("2026-04-01");
    expect(json.membership?.end_date).toBe("2026-05-01");
    expect(json.plan?.name).toBe("Monthly");
  });

  it("supports object-shaped relation payloads", async () => {
    relationShape = "object";
    const { GET } = await import("@/app/api/payments/[id]/route");

    const res = await GET(new Request("http://localhost/api/payments/payment-1"), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.member?.full_name).toBe("Aman");
    expect(json.membership?.start_date).toBe("2026-04-01");
    expect(json.membership?.end_date).toBe("2026-05-01");
    expect(json.plan?.name).toBe("Monthly");
  });
});

