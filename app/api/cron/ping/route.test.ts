import type { NextRequest } from "next/server";

let pingDbError = false;
let unauthorized = false;

vi.mock("@/lib/cron", () => ({
  verifyCronSecret: vi.fn(() =>
    unauthorized ? new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) : null
  ),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        limit: async () =>
          pingDbError ? { error: { message: "db failed" } } : { error: null },
      }),
    }),
  }),
}));

describe("GET /api/cron/ping", () => {
  afterEach(() => {
    pingDbError = false;
    unauthorized = false;
  });

  it("returns 200 when cron ping succeeds", async () => {
    const { GET } = await import("@/app/api/cron/ping/route");
    const req = new Request("http://localhost/api/cron/ping") as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns auth failure from verifyCronSecret", async () => {
    unauthorized = true;
    const { GET } = await import("@/app/api/cron/ping/route");
    const req = new Request("http://localhost/api/cron/ping") as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

