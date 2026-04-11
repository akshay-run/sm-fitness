import type { SupabaseClient } from "@supabase/supabase-js";

export type GymDisplay = {
  gym_name: string;
  address: string | null;
  phone: string | null;
  upi_id: string | null;
  logo_signed_url: string | null;
  upi_qr_signed_url: string | null;
};

export function gymAssetsBucket() {
  return process.env.SUPABASE_GYM_ASSETS_BUCKET || "gym-assets";
}

export async function getGymDisplay(
  supabaseAdmin: SupabaseClient
): Promise<GymDisplay> {
  const fallbackName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";
  const bucket = gymAssetsBucket();

  const { data, error } = await supabaseAdmin
    .from("gym_settings")
    .select("gym_name, address, phone, upi_id, logo_path, upi_qr_path")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return {
      gym_name: fallbackName,
      address: null,
      phone: null,
      upi_id: null,
      logo_signed_url: null,
      upi_qr_signed_url: null,
    };
  }

  let logo_signed_url: string | null = null;
  let upi_qr_signed_url: string | null = null;
  if (data.logo_path) {
    const s = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(String(data.logo_path), 3600);
    logo_signed_url = s.data?.signedUrl ?? null;
  }
  if (data.upi_qr_path) {
    const s = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(String(data.upi_qr_path), 3600);
    upi_qr_signed_url = s.data?.signedUrl ?? null;
  }

  return {
    gym_name: data.gym_name?.trim() || fallbackName,
    address: data.address,
    phone: data.phone,
    upi_id: data.upi_id,
    logo_signed_url,
    upi_qr_signed_url,
  };
}
