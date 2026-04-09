import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { updateMemberSchema } from "@/lib/validations/member.schema";

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
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const photoBucket =
    process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";
  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("id", parsedParams.data.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 404 });

  let photoSignedUrl: string | null = null;
  if (data?.photo_url) {
    const { data: signed } = await supabaseAdmin.storage
      .from(photoBucket)
      .createSignedUrl(String(data.photo_url), 60 * 60);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ member: data, photoSignedUrl });
}

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
  const parsedBody = updateMemberSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsedBody.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {
    ...parsedBody.data,
    email: parsedBody.data.email === "" ? null : parsedBody.data.email,
    date_of_birth: parsedBody.data.date_of_birth === "" ? null : parsedBody.data.date_of_birth,
    address: parsedBody.data.address === "" ? null : parsedBody.data.address,
    emergency_contact_name:
      parsedBody.data.emergency_contact_name === ""
        ? null
        : parsedBody.data.emergency_contact_name,
    emergency_contact_phone:
      parsedBody.data.emergency_contact_phone === ""
        ? null
        : parsedBody.data.emergency_contact_phone,
    notes: parsedBody.data.notes === "" ? null : parsedBody.data.notes,
  };

  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .update(patch)
    .eq("id", parsedParams.data.id)
    .select("id")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
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
  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .update({ is_active: false })
    .eq("id", parsedParams.data.id)
    .select("id")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

