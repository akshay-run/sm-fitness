import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getGymDisplay, gymAssetsBucket } from "@/lib/gymDisplay";
import { internalServerError } from "@/lib/apiError";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }
  const type = file.type || "";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 });
  }

  const ext =
    type === "image/png"
      ? "png"
      : type === "image/jpeg" || type === "image/jpg"
        ? "jpg"
        : type === "image/webp"
          ? "webp"
          : "bin";
  const path = `logo/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const supabaseAdmin = createSupabaseAdminClient();
  const bucket = gymAssetsBucket();
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(path, buf, {
    contentType: type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) return internalServerError(upErr.message);

  const { error: dbErr } = await supabaseAdmin
    .from("gym_settings")
    .upsert(
      { id: 1, logo_path: path, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (dbErr) return internalServerError(dbErr.message);

  const display = await getGymDisplay(supabaseAdmin);
  return NextResponse.json(display);
}
