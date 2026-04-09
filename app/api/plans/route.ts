import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("plans")
    .select("id, name, duration_months")
    .eq("is_active", true)
    .order("duration_months", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

