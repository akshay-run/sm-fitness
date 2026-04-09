vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

vi.mock("@/lib/dateUtils", () => ({
  todayISTDateString: vi.fn(() => "2026-04-10"),
  addDaysIST: vi.fn(() => "2026-04-21"),
  addMonthsIST: vi.fn(() => "2026-05-21"),
}));

let activeEndDateForMock: string | null = null;
let memberIsActiveForMock = true;

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () =>
    makeSupabaseMock({ activeEndDate: activeEndDateForMock }),
}));

function makeSupabaseMock({
  activeEndDate,
}: {
  activeEndDate: string | null;
}) {
  return {
    from: (table: string) => {
      if (table === "plans") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: "plan-1", duration_months: 1 },
                  error: null,
                }),
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
                data: { id: "member-1", is_active: memberIsActiveForMock },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              neq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: activeEndDate ? [{ id: "m-old", end_date: activeEndDate }] : [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "new-membership", start_date: "2026-04-21", end_date: "2026-05-21" },
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

describe("POST /api/memberships", () => {
  afterEach(() => {
    activeEndDateForMock = null;
    memberIsActiveForMock = true;
  });

  it("creates renewal from active membership end date + 1", async () => {
    activeEndDateForMock = "2026-04-20";
    const { POST: handler } = await import("@/app/api/memberships/route");

    const req = new Request("http://localhost/api/memberships", {
      method: "POST",
      body: JSON.stringify({
        member_id: "11111111-1111-4111-8111-111111111111",
        plan_id: "22222222-2222-4222-8222-222222222222",
        fee_charged: 1200,
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("new-membership");
  });

  it("returns 400 for inactive member", async () => {
    memberIsActiveForMock = false;
    const { POST: handler } = await import("@/app/api/memberships/route");

    const req = new Request("http://localhost/api/memberships", {
      method: "POST",
      body: JSON.stringify({
        member_id: "11111111-1111-4111-8111-111111111111",
        plan_id: "22222222-2222-4222-8222-222222222222",
        fee_charged: 1200,
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/inactive member/i);
  });
});

