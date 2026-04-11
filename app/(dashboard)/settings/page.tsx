import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { PlansManager } from "@/components/settings/PlansManager";

export const metadata: Metadata = {
  title: "Settings — SM FITNESS",
  description: "Gym settings and plans",
};

export default function SettingsPage() {
  return (
    <div className="space-y-10 pb-24">
      <SettingsClient />
      <PlansManager />
    </div>
  );
}
