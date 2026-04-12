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

vi.mock("@/lib/memberEmail", () => ({
  skipMemberEmailIfNoAddress: vi.fn((m: { email?: string | null }) =>
    m.email?.trim() ? { skipped: false as const, to: m.email.trim() } : { skipped: true as const }
  ),
}));

vi.mock("@/components/email/WelcomeEmail", () => ({
  renderWelcomeEmail: vi.fn(() => "<html>welcome</html>"),
}));

const memberRow = {
  id: "member-1",
  member_code: "GYM-001",
  full_name: "Aman",
  mobile: "9876543210",
  email: "aman@example.com",
  photo_url: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const membershipRow = {
  member_id: "member-1",
  plan_id: "plan-1",
  end_date: "2099-01-01",
  status: "active",
};

function makeMembersSupabaseMock() {
  return {
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "https://example.com/photo.jpg" } }),
      }),
    },
    from: (table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            neq: () => ({
              order: () =>
                Promise.resolve({
                  data: [membershipRow],
                  error: null,
                }),
            }),
            in: () => ({
              neq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [membershipRow],
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "plans") {
        return {
          select: () => ({
            in: async () => ({
              data: [{ id: "plan-1", name: "Monthly" }],
            }),
          }),
        };
      }
      if (table !== "members") throw new Error(`Unexpected table ${table}`);
      return {
        select: (fields: string) => {
          if (fields === "id, is_active, created_at") {
            return Promise.resolve({
              data: [memberRow],
              error: null,
            });
          }
          if (fields === "id") {
            return {
              in: () => ({
                or: () =>
                  Promise.resolve({
                    data: [{ id: "member-1" }],
                    error: null,
                  }),
              }),
            };
          }
          return {
            in: () =>
              Promise.resolve({
                data: [memberRow],
                error: null,
              }),
          };
        },
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
    const req = new Request("http://localhost/api/members?page=1&pageSize=20&tab=all");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.tabCounts).toBeDefined();
  });

  it("POST creates member with generated code", async () => {
    const { POST } = await import("@/app/api/members/route");
    const req = new Request("http://localhost/api/members", {
      method: "POST",
      body: JSON.stringify({
        full_name: "New User",
        mobile: "9876543210",
        email: "new@example.com",
        joining_date: "2026-04-11",
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
        email: "x@example.com",
        joining_date: "2026-04-11",
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
