"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SettingsPayload = {
  gym_name: string;
  address: string | null;
  phone: string | null;
  upi_id: string | null;
  backup_email: string | null;
  whatsapp_group_link: string | null;
  logo_signed_url: string | null;
  upi_qr_signed_url: string | null;
  logo_path: string | null;
  upi_qr_path: string | null;
};

const cardClass =
  "mb-6 rounded-[12px] border border-[#E2E8F0] bg-white p-5 shadow-none";
const sectionTitleClass =
  "mb-4 border-b border-[#E2E8F0] pb-2 text-sm font-semibold text-[#1A1A2E]";
const fieldLabelClass = "text-sm font-medium text-zinc-800";
const inputClass = "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm";
const hintClass = "text-xs text-zinc-500";

export function SettingsClient() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gymName, setGymName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [backupEmail, setBackupEmail] = useState("");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as SettingsPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
      return json as SettingsPayload;
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data) return;
    setGymName(data.gym_name || "");
    setAddress(data.address ?? "");
    setPhone(data.phone ?? "");
    setUpiId(data.upi_id ?? "");
    setBackupEmail(data.backup_email ?? "");
    setWhatsappGroupLink(data.whatsapp_group_link ?? "");
    setLogoUrl(data.logo_signed_url);
    setQrUrl(data.upi_qr_signed_url);
    setLoading(false);
  }, [data]);

  async function saveText(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gym_name: gymName.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          upi_id: upiId.trim() || null,
          backup_email: backupEmail.trim() || null,
          whatsapp_group_link: whatsappGroupLink.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Could not save. Please check your connection.");
      toast.success("Settings saved ✓");
      setLogoUrl(json.logo_signed_url ?? null);
      setQrUrl(json.upi_qr_signed_url ?? null);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Could not save. Please check your connection."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Upload failed");
    setLogoUrl(json.logo_signed_url ?? null);
    toast.success("Logo updated");
  }

  async function uploadQr(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/settings/upi-qr", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Upload failed");
    setQrUrl(json.upi_qr_signed_url ?? null);
    toast.success("UPI QR updated");
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6 text-sm text-zinc-600">Loading…</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 pb-28 md:p-6 md:pb-32">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Gym details, UPI, and branding used on receipts and payment screens.
      </p>

      <form onSubmit={saveText} className="mt-6 space-y-0">
        <section className={cardClass} aria-labelledby="settings-gym-profile">
          <h2 id="settings-gym-profile" className={sectionTitleClass}>
            Gym Profile
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className={fieldLabelClass} htmlFor="gym_name">
                Gym name
              </label>
              <input
                id="gym_name"
                className={inputClass}
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className={fieldLabelClass} htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                rows={3}
                className={inputClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={fieldLabelClass} htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className={cardClass} aria-labelledby="settings-payment">
          <h2 id="settings-payment" className={sectionTitleClass}>
            Payment Details
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className={fieldLabelClass} htmlFor="upi_id">
                UPI ID
              </label>
              <input
                id="upi_id"
                className={inputClass}
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@bank"
              />
            </div>
            <div className="space-y-2">
              <div className={fieldLabelClass}>UPI QR image</div>
              <p className={hintClass}>Uploaded QR is shown when recording UPI payments.</p>
              {qrUrl ? (
                <div className="flex justify-center py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="UPI QR"
                    className="max-h-[120px] w-auto object-contain"
                  />
                </div>
              ) : null}
              <div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadQr(f).catch((err) => toast.error(String(err)));
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className={cardClass} aria-labelledby="settings-branding">
          <h2 id="settings-branding" className={sectionTitleClass}>
            Branding
          </h2>
          <div className="space-y-2">
            <div className={fieldLabelClass}>Logo</div>
            <p className={hintClass}>PNG/JPG/WebP, max 2MB. Shown on receipts.</p>
            {logoUrl ? (
              <div className="py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Gym logo"
                  className="h-[60px] w-[60px] rounded-lg object-contain"
                />
              </div>
            ) : null}
            <div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadLogo(f).catch((err) => toast.error(String(err)));
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        <section className={cardClass} aria-labelledby="settings-notify">
          <h2 id="settings-notify" className={sectionTitleClass}>
            Notifications &amp; Backup
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className={fieldLabelClass} htmlFor="backup_email">
                Backup email address
              </label>
              <p className={hintClass}>Member backup report sent here every 5 days</p>
              <input
                id="backup_email"
                type="email"
                className={inputClass}
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                placeholder="owner.backup@gmail.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <label className={fieldLabelClass} htmlFor="whatsapp_group_link">
                Gym WhatsApp group link
              </label>
              <p className={hintClass}>Shared with new members in welcome message</p>
              <div className="flex flex-wrap items-stretch gap-2">
                <input
                  id="whatsapp_group_link"
                  type="url"
                  className={`${inputClass} min-w-0 flex-1`}
                  value={whatsappGroupLink}
                  onChange={(e) => setWhatsappGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                />
                <button
                  type="button"
                  title="Opens link to verify it works"
                  disabled={!whatsappGroupLink.trim()}
                  onClick={() => window.open(whatsappGroupLink.trim(), "_blank", "noopener,noreferrer")}
                  className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-10 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
