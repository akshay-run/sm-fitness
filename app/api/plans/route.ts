import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("plans")
    .select("id, name, duration_months, default_price") // Make sure default_price is fetched if it exists
    .eq("is_active", true)
    .order("duration_months", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireUser();
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.duration_months) {
    return NextResponse.json({ error: "Name and duration_months are required" }, { status: 400 });
  }

  const payload: any = {
    name: body.name,
    duration_months: body.duration_months,
    is_active: true
  };
  if (body.default_price !== undefined) {
    payload.default_price = body.default_price;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.from("plans").insert(payload).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

export async function DELETE(req: Request) {
  const { user, error: authError } = await requireUser();
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });
  
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("plans").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
