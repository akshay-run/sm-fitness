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
    .from("memberships")
    .select("id, member_id, plan_id, fee_charged, start_date, end_date")
    .eq("id", parsedParams.data.id)
    .single();

  if (dbError) {
    console.error("[GET /api/memberships/:id]", dbError);
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }
  return NextResponse.json({ membership: data });
}

