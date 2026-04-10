import type { NextRequest } from "next/server";
vi.mock("@/lib/cron", () => ({
  verifyCronSecret: vi.fn(() => null),
}));

vi.mock("@/lib/dateUtils", () => ({
  todayISTDateString: vi.fn(() => "2026-04-10"),
  addDaysIST: vi.fn((d: string, n: number) => (n === 7 ? "2026-04-17" : "2026-04-11")),
}));

vi.mock("@/lib/email", () => ({
  hasSentEmailOnDate: vi.fn(async () => false),
  sendAndLog: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/components/email/ReminderEmail", () => ({
  renderReminderEmail: vi.fn(() => "<html>reminder</html>"),
}));

function createCronSupabaseMock() {
  return {
    from: (table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            neq: () => ({
              eq: async () => ({
                data: [{ id: "ms1", member_id: "m1", plan_id: "p1", end_date: "2026-04-17" }],
                error: null,
              }),
            }),
          }),
          update: () => ({
            neq: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === "members") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "m1", full_name: "Aman", email: "aman@example.com", is_active: true },
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
  createSupabaseAdminClient: () => createCronSupabaseMock(),
}));

describe("cron reminders route", () => {
  it("returns stats payload when cron runs", async () => {
    const { GET } = await import("@/app/api/cron/reminders/route");
    const req = new Request("http://localhost/api/cron/reminders") as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.stats).toBeDefined();
  });
});

