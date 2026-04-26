import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { internalServerError } from "@/lib/apiError";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  duration_months: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "Plan duration must be at least 1 month")
    .max(36, "Plan duration cannot exceed 36 months"),
  default_price: z.coerce.number().nonnegative().nullable().optional(),
});

const querySchema = z.object({
  scope: z.enum(["manage"]).optional(),
});

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const parsedQuery = querySchema.safeParse({
    scope: new URL(req.url).searchParams.get("scope") ?? undefined,
  });
  if (!parsedQuery.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const scope = parsedQuery.data.scope;
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

  if (dbError) return internalServerError("Failed to load plans");
  const plans = data ?? [];
  return NextResponse.json({ data: { plans }, plans });
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

  if (dbError) return internalServerError("Failed to create plan");
  return NextResponse.json({ data: { plan: data }, plan: data }, { status: 201 });
}

