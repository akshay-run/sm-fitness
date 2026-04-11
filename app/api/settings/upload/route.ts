import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user, error: authError } = await requireUser();
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "No form data" }, { status: 400 });

  const file = formData.get("file") as Blob | null;
  const type = formData.get("type") as string | null;
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No valid file found" }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";

  // Re-use member photo bucket for settings since it's already configured
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "img";
  const path = `settings_${type || "asset"}_${Date.now()}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({ url: uploadData.path });
}
