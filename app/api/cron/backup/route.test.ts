import type { NextRequest } from "next/server";

const sendMail = vi.fn(async () => {});
const logBackupEmail = vi.fn(async () => {});

vi.mock("@/lib/mailer", () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
}));

vi.mock("@/lib/email", () => ({
  logBackupEmail: (...args: unknown[]) => logBackupEmail(...args),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "members") {
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  id: "m1",
                  full_name: "Member One",
                  mobile: "9876543210",
                  email: null,
                  member_code: "GYM-001",
                  created_at: "2026-01-01T00:00:00Z",
                },
              ],
              error: null,
            }),
        };
      }
      if (table === "memberships") {
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  id: "ms1",
                  member_id: "m1",
                  plan_id: "p1",
                  start_date: "2026-04-01",
                  end_date: "2026-05-01",
                  fee_charged: 1000,
                  status: "active",
                },
              ],
              error: null,
            }),
        };
      }
      if (table === "payments") {
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  member_id: "m1",
                  amount: 1000,
                  payment_date: "2026-04-05T12:00:00+05:30",
                  payment_mode: "upi",
                },
              ],
              error: null,
            }),
        };
      }
      if (table === "plans") {
        return {
          select: () =>
            Promise.resolve({
              data: [{ id: "p1", name: "Monthly" }],
              error: null,
            }),
        };
      }
      if (table === "gym_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { backup_email: "backup@example.com" }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

describe("GET /api/cron/backup", () => {
  const OLD = process.env.CRON_SECRET;

  beforeEach(() => {
    sendMail.mockClear();
    logBackupEmail.mockClear();
    process.env.CRON_SECRET = "secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = OLD;
  });

  it("returns 401 without bearer", async () => {
    const { GET } = await import("@/app/api/cron/backup/route");
    const req = new Request("http://localhost/api/cron/backup") as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("sends backup and logs when authorized", async () => {
    const { GET } = await import("@/app/api/cron/backup/route");
    const req = new Request("http://localhost/api/cron/backup", {
      headers: { Authorization: "Bearer secret" },
    }) as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.summary?.total).toBe(1);
    expect(sendMail).toHaveBeenCalled();
    expect(logBackupEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        sent_to: "backup@example.com",
        status: "sent",
      })
    );
  });

});
