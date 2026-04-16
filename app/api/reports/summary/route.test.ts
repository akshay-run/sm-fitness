type PaymentRow = {
  id: string;
  amount: number;
  payment_mode: string;
  payment_date: string;
  receipt_number: string;
  membership_id: string;
  member_id: string;
  members: { full_name: string; mobile: string | null } | { full_name: string; mobile: string | null }[] | null;
  memberships:
    | {
        plan_id: string;
        start_date: string;
        end_date: string;
        plans: { name: string } | { name: string }[] | null;
      }
    | {
        plan_id: string;
        start_date: string;
        end_date: string;
        plans: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

const mockRequireUser = jest.fn(async () => ({ user: { id: "admin-1" }, error: null }));
const mockPayments: PaymentRow[] = [];
const mockMembersForGrowth = [{ id: "m1", joining_date: "2026-04-02", created_at: "2026-04-02T00:00:00Z" }];
const mockFromCalls: string[] = [];

jest.mock("@/lib/auth", () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      mockFromCalls.push(table);
      if (table === "payments") {
        return {
          select: () => ({
            order: () => ({
              gte: () => ({
                lt: async () => ({ data: mockPayments, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "members") {
        return {
          select: async () => ({ data: mockMembersForGrowth, error: null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

describe("GET /api/reports/summary", () => {
  beforeEach(() => {
    mockRequireUser.mockReset();
    mockRequireUser.mockResolvedValue({ user: { id: "admin-1" }, error: null });
    mockPayments.length = 0;
    mockFromCalls.length = 0;
  });

  it("returns 401 when user is unauthorized", async () => {
    mockRequireUser.mockResolvedValue({ user: null, error: "Unauthorized" });
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/reports/summary?scope=this_month"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid scope", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/reports/summary?scope=bad_scope"));
    expect(res.status).toBe(400);
  });

  it("maps object and array relation shapes into report rows", async () => {
    mockPayments.push(
      {
        id: "p-obj",
        amount: 700,
        payment_mode: "upi",
        payment_date: "2026-04-15",
        receipt_number: "R1",
        membership_id: "ms1",
        member_id: "m1",
        members: { full_name: "Nono", mobile: "9317171811" },
        memberships: {
          plan_id: "plan-1",
          start_date: "2026-03-15",
          end_date: "2026-04-15",
          plans: { name: "Monthly" },
        },
      },
      {
        id: "p-arr",
        amount: 2000,
        payment_mode: "cash",
        payment_date: "2026-04-13",
        receipt_number: "R2",
        membership_id: "ms2",
        member_id: "m2",
        members: [{ full_name: "Sai", mobile: "9421028657" }],
        memberships: [
          {
            plan_id: "plan-2",
            start_date: "2026-01-13",
            end_date: "2027-01-13",
            plans: [{ name: "Annual" }],
          },
        ],
      }
    );

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/reports/summary?scope=this_month"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toHaveLength(2);
    expect(json.payments[0]).toMatchObject({
      member_name: "Nono",
      member_mobile: "9317171811",
      plan_name: "Monthly",
    });
    expect(json.payments[1]).toMatchObject({
      member_name: "Sai",
      member_mobile: "9421028657",
      plan_name: "Annual",
    });
  });

  it("uses bounded query count for summary generation", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/reports/summary?scope=this_month"));
    expect(res.status).toBe(200);
    const paymentsCalls = mockFromCalls.filter((t) => t === "payments").length;
    const membersCalls = mockFromCalls.filter((t) => t === "members").length;
    expect(paymentsCalls).toBe(1);
    expect(membersCalls).toBe(1);
  });
});
