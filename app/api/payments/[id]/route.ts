import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", parsedParams.data.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 404 });

  const [{ data: membership }, { data: member }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("id, plan_id, start_date, end_date")
      .eq("id", data.membership_id)
      .single(),
    supabaseAdmin
      .from("members")
      .select("id, full_name, member_code, mobile")
      .eq("id", data.member_id)
      .single(),
    supabaseAdmin
      .from("gym_settings")
      .select("*")
      .limit(1)
      .single(),
  ]);

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("name")
    .eq("id", membership?.plan_id ?? "")
    .single();

  return NextResponse.json({
    payment: data,
    member: member ?? null,
    membership: membership ?? null,
    plan: plan ?? null,
    settings: settings ?? null,
  });
}

