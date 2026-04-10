vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

let revenueDbError = false;

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table !== "payments") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          order: async () =>
            revenueDbError
              ? { data: null, error: { message: "db failed" } }
              : {
                  data: [
                    { payment_date: "2026-04-01", amount: 1000, payment_mode: "cash" },
                    { payment_date: "2026-04-10", amount: 2000, payment_mode: "upi" },
                  ],
                  error: null,
                },
        }),
      };
    },
  }),
}));

describe("GET /api/reports/revenue", () => {
  afterEach(() => {
    revenueDbError = false;
  });

  it("returns monthly revenue aggregation", async () => {
    const { GET } = await import("@/app/api/reports/revenue/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows[0].total).toBe(3000);
    expect(json.rows[0].cash_total).toBe(1000);
    expect(json.rows[0].upi_total).toBe(2000);
  }, 10000);

  it("returns 500 when db query fails", async () => {
    revenueDbError = true;
    const { GET } = await import("@/app/api/reports/revenue/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

