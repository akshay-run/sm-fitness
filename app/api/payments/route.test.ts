vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

vi.mock("@/lib/receiptNumber", () => ({
  getNextReceiptNumber: vi.fn(async () => "RCP-2026-0001"),
}));

vi.mock("@/lib/email", () => ({
  hasSentEmail: vi.fn(async () => false),
  sendAndLog: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/components/email/ReceiptEmail", () => ({
  renderReceiptEmail: vi.fn(() => "<html>receipt</html>"),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => supabasePaymentAlreadyExistsMock(),
}));

let existingCountForMock = 1;
let insertErrorForMock: { message: string; code?: string } | null = null;

function supabasePaymentAlreadyExistsMock() {
  return {
    from: (table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "membership-1",
                  member_id: "member-1",
                  fee_charged: 1500,
                  plan_id: "plan-1",
                  start_date: "2026-04-01",
                  end_date: "2026-05-01",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "payments") {
        return {
          select: () => ({
            eq: async () => ({ count: existingCountForMock, error: null }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: insertErrorForMock ? null : { id: "payment-1", receipt_number: "RCP-2026-0001" },
                error: insertErrorForMock,
              }),
            }),
          }),
        };
      }
      if (table === "members") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "member-1", full_name: "Aman", email: null },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "plans") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { name: "Monthly" },
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("POST /api/payments", () => {
  afterEach(() => {
    existingCountForMock = 1;
    insertErrorForMock = null;
  });

  it("returns 409 when payment already exists for membership", async () => {
    const { POST } = await import("@/app/api/payments/route");
    const req = new Request("http://localhost/api/payments", {
      method: "POST",
      body: JSON.stringify({
        membership_id: "11111111-1111-4111-8111-111111111111",
        payment_mode: "cash",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(String(json.error)).toMatch(/Payment already exists/i);
  });

  it("returns 409 when DB unique constraint rejects duplicate insert", async () => {
    existingCountForMock = 0;
    insertErrorForMock = { message: "duplicate key value", code: "23505" };

    const { POST } = await import("@/app/api/payments/route");
    const req = new Request("http://localhost/api/payments", {
      method: "POST",
      body: JSON.stringify({
        membership_id: "11111111-1111-4111-8111-111111111111",
        payment_mode: "cash",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(String(json.error)).toMatch(/already exists/i);
  });
});

