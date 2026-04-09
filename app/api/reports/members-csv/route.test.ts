vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

function makeCsvSupabaseMock() {
  return {
    from: (table: string) => {
      if (table === "members") {
        return {
          select: () => ({
            order: async () => ({
              data: [
                {
                  id: "m1",
                  full_name: "Aman",
                  mobile: "9876543210",
                  email: "aman@example.com",
                  is_active: true,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              neq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [{ plan_id: "p1", end_date: "2099-01-01" }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "plans") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { name: "Monthly" }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => makeCsvSupabaseMock(),
}));

describe("reports members-csv route", () => {
  it("returns csv body with expected header", async () => {
    const { GET } = await import("@/app/api/reports/members-csv/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.split("\n")[0]).toBe("name,mobile,email,plan,expiry,status");
    expect(text).toContain("Aman");
    expect(text).toContain("Monthly");
  });
});

