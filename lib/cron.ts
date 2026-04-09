import { NextResponse, type NextRequest } from "next/server";

export function verifyCronSecret(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const header = req.headers.get("x-cron-secret");
  const provided = header;

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

