import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getGymDisplay } from "@/lib/gymDisplay";
import { internalServerError } from "@/lib/apiError";

const patchSchema = z.object({
  gym_name: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().max(1000).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  upi_id: z.string().trim().max(200).nullable().optional(),
});

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();
  const display = await getGymDisplay(supabaseAdmin);

  const { data: raw } = await supabaseAdmin
    .from("gym_settings")
    .select("gym_name, address, phone, upi_id, logo_path, upi_qr_path")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    ...display,
    logo_path: raw?.logo_path ?? null,
    upi_qr_path: raw?.upi_qr_path ?? null,
  });
}

export async function PATCH(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.gym_name !== undefined) updates.gym_name = parsed.data.gym_name;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.upi_id !== undefined) updates.upi_id = parsed.data.upi_id;

  const { error: upError } = await supabaseAdmin
    .from("gym_settings")
    .upsert({ id: 1, ...updates }, { onConflict: "id" });

  if (upError) return internalServerError(upError.message);

  const display = await getGymDisplay(supabaseAdmin);
  return NextResponse.json(display);
}
