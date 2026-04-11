import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { internalServerError } from "@/lib/apiError";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  duration_months: z.coerce.number().int().min(1).max(120),
  default_price: z.coerce.number().nonnegative().nullable().optional(),
});

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const scope = new URL(req.url).searchParams.get("scope");
  const manage = scope === "manage";

  const supabaseAdmin = createSupabaseAdminClient();
  const selectCols = manage
    ? "id, name, duration_months, default_price, is_active"
    : "id, name, duration_months, default_price";

  let q = supabaseAdmin.from("plans").select(selectCols).order("duration_months", { ascending: true });

  if (!manage) {
    q = q.eq("is_active", true);
  }

  const { data, error: dbError } = await q;

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("plans")
    .insert({
      name: parsed.data.name,
      duration_months: parsed.data.duration_months,
      default_price: parsed.data.default_price ?? null,
      is_active: true,
    })
    .select("id, name, duration_months, default_price, is_active")
    .single();

  if (dbError) return internalServerError(dbError.message);
  return NextResponse.json({ plan: data }, { status: 201 });
}

