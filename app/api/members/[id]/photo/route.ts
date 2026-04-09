import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
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

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const photoBucket =
    process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";
  const memberId = parsedParams.data.id;
  const path = `members/${memberId}/photo.jpg`;

  const uploadRes = await supabaseAdmin.storage
    .from(photoBucket)
    .upload(path, file, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadRes.error) {
    return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({ photo_url: path })
    .eq("id", memberId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from(photoBucket)
    .createSignedUrl(path, 60 * 60);

  if (signedError) {
    return NextResponse.json({ error: signedError.message }, { status: 500 });
  }

  return NextResponse.json({ path, signedUrl: signed?.signedUrl ?? null });
}

