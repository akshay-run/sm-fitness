import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { internalServerError } from "@/lib/apiError";

const paramsSchema = z.object({ id: z.string().uuid() });

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  duration_months: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "Plan duration must be at least 1 month")
    .max(36, "Plan duration cannot exceed 36 months")
    .optional(),
  default_price: z.coerce.number().nonnegative().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("plans")
    .update(parsed.data)
    .eq("id", parsedParams.data.id)
    .select("id, name, duration_months, default_price, is_active")
    .single();

  if (dbError) return internalServerError(dbError.message);
  return NextResponse.json({ plan: data });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { count: usageCount, error: usageError } = await supabaseAdmin
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", parsedParams.data.id);

  if (usageError) return internalServerError(usageError.message);
  if ((usageCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete this plan because it is used in membership records." },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabaseAdmin
    .from("plans")
    .delete()
    .eq("id", parsedParams.data.id);

  if (dbError) return internalServerError(dbError.message);
  return NextResponse.json({ ok: true });
}
