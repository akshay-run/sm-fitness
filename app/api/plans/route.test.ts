vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

let plansDbError = false;

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table !== "plans") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          order: () => ({
            eq: async () =>
              plansDbError
                ? { data: null, error: { message: "db failed" } }
                : {
                    data: [
                      {
                        id: "p1",
                        name: "Monthly",
                        duration_months: 1,
                        default_price: 1200,
                      },
                    ],
                    error: null,
                  },
          }),
        }),
      };
    },
  }),
}));

describe("GET /api/plans", () => {
  afterEach(() => {
    plansDbError = false;
  });

  it("returns active plans", async () => {
    const { GET } = await import("@/app/api/plans/route");
    const res = await GET(new Request("http://localhost/api/plans"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plans).toHaveLength(1);
  });

  it("returns 500 when db query fails", async () => {
    plansDbError = true;
    const { GET } = await import("@/app/api/plans/route");
    const res = await GET(new Request("http://localhost/api/plans"));
    expect(res.status).toBe(500);
  });
});

