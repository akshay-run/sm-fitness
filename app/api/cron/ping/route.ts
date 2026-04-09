import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cron";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const authFail = verifyCronSecret(req);
  if (authFail) return authFail;

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("plans").select("id", { head: true }).limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}

