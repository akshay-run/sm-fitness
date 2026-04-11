import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getGymDisplay } from "@/lib/gymDisplay";

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

  const [{ data: membership }, { data: member }] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("id, plan_id, start_date, end_date")
      .eq("id", data.membership_id)
      .single(),
    supabaseAdmin
      .from("members")
      .select("id, full_name, member_code, mobile, welcome_wa_sent")
      .eq("id", data.member_id)
      .single(),
  ]);

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("name")
    .eq("id", membership?.plan_id ?? "")
    .single();

  const gym = await getGymDisplay(supabaseAdmin);

  return NextResponse.json({
    payment: data,
    member: member ?? null,
    membership: membership ?? null,
    plan: plan ?? null,
    gym,
  });
}

