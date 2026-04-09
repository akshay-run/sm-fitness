import { hasSentEmailOnDate } from "@/lib/email";

describe("email helper duplicate checks", () => {
  it("returns true when sent count > 0", async () => {
    const supabaseMock = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  lt: async () => ({ count: 1, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const out = await hasSentEmailOnDate({
      supabaseAdmin: supabaseMock as never,
      member_id: "member-1",
      type: "receipt",
      dateIST: "2026-04-01",
    });
    expect(out).toBe(true);
  });

  it("returns false on query error", async () => {
    const supabaseMock = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  lt: async () => ({ count: 0, error: { message: "db error" } }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const out = await hasSentEmailOnDate({
      supabaseAdmin: supabaseMock as never,
      member_id: "member-1",
      type: "receipt",
      dateIST: "2026-04-01",
    });
    expect(out).toBe(false);
  });
});

