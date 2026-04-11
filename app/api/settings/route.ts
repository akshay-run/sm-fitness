import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("gym_settings")
    .select("*")
    .limit(1)
    .single();

  if (dbError && dbError.code !== "PGRST116") {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data || null });
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireUser();
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabaseAdmin = createSupabaseAdminClient();

  // We should ideally have 1 row. Let's do an upsert or update the first row
  const { data: existing } = await supabaseAdmin.from("gym_settings").select("id").limit(1).single();

  let res;
  if (existing) {
    res = await supabaseAdmin.from("gym_settings").update({
      gym_name: body.gym_name,
      address: body.address,
      phone: body.phone,
      upi_id: body.upi_id,
      logo_url: body.logo_url,
      upi_qr_url: body.upi_qr_url,
      updated_at: new Date().toISOString()
    }).eq("id", existing.id).select().single();
  } else {
    res = await supabaseAdmin.from("gym_settings").insert({
      gym_name: body.gym_name || "SM FITNESS",
      address: body.address,
      phone: body.phone,
      upi_id: body.upi_id,
      logo_url: body.logo_url,
      upi_qr_url: body.upi_qr_url,
    }).select().single();
  }

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  
  return NextResponse.json({ settings: res.data });
}
