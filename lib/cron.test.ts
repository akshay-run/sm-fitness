import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cron";

describe("verifyCronSecret", () => {
  it("rejects when no auth headers", () => {
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

  it("accepts Authorization Bearer header (Vercel cron)", () => {
    process.env.CRON_SECRET = "top-secret";
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer top-secret" },
    }) as unknown as NextRequest;
    const res = verifyCronSecret(req);
    expect(res).toBeNull();
  });

  it("accepts Bearer with different casing", () => {
    process.env.CRON_SECRET = "abc";
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "bearer abc" },
    }) as unknown as NextRequest;
    expect(verifyCronSecret(req)).toBeNull();
  });
});
