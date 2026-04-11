"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type SettingsPayload = {
  gym_name: string;
  address: string | null;
  phone: string | null;
  upi_id: string | null;
  logo_signed_url: string | null;
  upi_qr_signed_url: string | null;
  logo_path: string | null;
  upi_qr_path: string | null;
};

export function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gymName, setGymName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = (await res.json()) as SettingsPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
      setGymName(json.gym_name || "");
      setAddress(json.address ?? "");
      setPhone(json.phone ?? "");
      setUpiId(json.upi_id ?? "");
      setLogoUrl(json.logo_signed_url);
      setQrUrl(json.upi_qr_signed_url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      toast.success("Settings saved");
      setLogoUrl(json.logo_signed_url ?? null);
      setQrUrl(json.upi_qr_signed_url ?? null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
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
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Gym details, UPI, and branding used on receipts and payment screens.
      </p>

      <form onSubmit={saveText} className="card-surface mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="gym_name">
            Gym name
          </label>
          <input
            id="gym_name"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="upi_id">
            UPI ID
          </label>
          <input
            id="upi_id"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="name@bank"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-zinc-100 pt-4 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-zinc-800">Logo</div>
            <p className="mt-1 text-xs text-zinc-500">Shown on receipts. PNG/JPG/WebP, max 2MB.</p>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Gym logo" className="mt-2 h-20 w-auto object-contain" />
            ) : null}
            <input
              type="file"
              accept="image/*"
              className="mt-2 text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadLogo(f).catch((err) => toast.error(String(err)));
              }}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-800">UPI QR image</div>
            <p className="mt-1 text-xs text-zinc-500">Uploaded QR is shown when recording UPI payments.</p>
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="UPI QR" className="mt-2 h-32 w-32 object-contain" />
            ) : null}
            <input
              type="file"
              accept="image/*"
              className="mt-2 text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadQr(f).catch((err) => toast.error(String(err)));
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
