import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cron";

describe("verifyCronSecret", () => {
  it("rejects missing x-cron-secret header", () => {
    process.env.CRON_SECRET = "top-secret";
    const req = new Request("http://localhost/api/cron/reminders") as unknown as NextRequest;
    const res = verifyCronSecret(req);
    expect(res?.status).toBe(401);
  });

  it("accepts valid x-cron-secret header", () => {
    process.env.CRON_SECRET = "top-secret";
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { "x-cron-secret": "top-secret" },
    }) as unknown as NextRequest;
    const res = verifyCronSecret(req);
    expect(res).toBeNull();
  });
});
