import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { PlansManager } from "@/components/settings/PlansManager";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getGymDisplay } from "@/lib/gymDisplay";

export const metadata: Metadata = {
  title: "Settings — SM FITNESS",
  description: "Gym settings and plans",
};

export default async function SettingsPage() {
  const supabaseAdmin = createSupabaseAdminClient();
  const gym = await getGymDisplay(supabaseAdmin);
  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("id, name, duration_months, default_price, is_active")
    .order("duration_months", { ascending: true });

  return (
    <div className="space-y-10 pb-24">
      <SettingsClient
        initialSettings={{
          gym_name: gym.gym_name,
          address: gym.address,
          phone: gym.phone,
          upi_id: gym.upi_id,
          backup_email: gym.backup_email,
          whatsapp_group_link: gym.whatsapp_group_link,
          logo_signed_url: gym.logo_signed_url,
          upi_qr_signed_url: gym.upi_qr_signed_url,
          logo_path: null,
          upi_qr_path: null,
        }}
      />
      <PlansManager initialPlans={(plans ?? []) as Array<{ id: string; name: string; duration_months: number; default_price: number | null; is_active: boolean }>} />
    </div>
  );
}
