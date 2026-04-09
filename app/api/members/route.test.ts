vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

vi.mock("@/lib/memberCode", () => ({
  getNextMemberCode: vi.fn(async () => "GYM-999"),
}));

vi.mock("@/lib/email", () => ({
  hasSentEmail: vi.fn(async () => false),
  sendAndLog: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/components/email/WelcomeEmail", () => ({
  renderWelcomeEmail: vi.fn(() => "<html>welcome</html>"),
}));

function makeMembersSupabaseMock() {
  return {
    from: (table: string) => {
      if (table !== "members") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          order: () => ({
            eq: () => ({
              or: () => ({
                range: async () => ({
                  data: [
                    {
                      id: "member-1",
                      member_code: "GYM-001",
                      full_name: "Aman",
                      mobile: "9876543210",
                      email: "aman@example.com",
                    },
                  ],
                  error: null,
                  count: 1,
                }),
              }),
              range: async () => ({
                data: [
                  {
                    id: "member-1",
                    member_code: "GYM-001",
                    full_name: "Aman",
                    mobile: "9876543210",
                    email: "aman@example.com",
                  },
                ],
                error: null,
                count: 1,
              }),
            }),
            or: () => ({
              range: async () => ({
                data: [],
                error: null,
                count: 0,
              }),
            }),
            range: async () => ({
              data: [],
              error: null,
              count: 0,
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "member-new",
                member_code: "GYM-999",
                full_name: "New User",
                email: "new@example.com",
              },
              error: null,
            }),
          }),
        }),
      };
    },
  };
}

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => makeMembersSupabaseMock(),
}));

describe("members route", () => {
  afterEach(async () => {
    const auth = await import("@/lib/auth");
    const memberCode = await import("@/lib/memberCode");
    vi.mocked(auth.requireUser).mockResolvedValue({ user: { id: "admin-1" }, error: null });
    vi.mocked(memberCode.getNextMemberCode).mockResolvedValue("GYM-999");
  });

  it("GET returns paginated members", async () => {
    const { GET } = await import("@/app/api/members/route");
    const req = new Request("http://localhost/api/members?page=1&pageSize=20&is_active=true");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
  });

  it("POST creates member with generated code", async () => {
    const { POST } = await import("@/app/api/members/route");
    const req = new Request("http://localhost/api/members", {
      method: "POST",
      body: JSON.stringify({
        full_name: "New User",
        mobile: "9876543210",
        email: "new@example.com",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.member_code).toBe("GYM-999");
  });

  it("POST returns 503 when member code generator fails", async () => {
    const memberCode = await import("@/lib/memberCode");
    vi.mocked(memberCode.getNextMemberCode).mockRejectedValue(
      new Error("next_member_code function not found")
    );

    const { POST } = await import("@/app/api/members/route");
    const req = new Request("http://localhost/api/members", {
      method: "POST",
      body: JSON.stringify({
        full_name: "New User",
        mobile: "9876543210",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(String(json.error)).toMatch(/member code generator is not configured/i);
  });

  it("GET returns 401 when user is not authorized", async () => {
    const auth = await import("@/lib/auth");
    vi.mocked(auth.requireUser).mockResolvedValue({
      user: null,
      error: "Admin access required",
    });

    const { GET } = await import("@/app/api/members/route");
    const req = new Request("http://localhost/api/members?page=1&pageSize=20");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

