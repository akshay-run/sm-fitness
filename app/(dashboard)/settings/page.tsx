"use client";

export const metadata = { title: "Settings – SM FITNESS" };

import { useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import { compressImageToJpeg } from "@/lib/imageCompress";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SettingsPage() {
  const { data: settingsData, mutate: mutateSettings } = useSWR("/api/settings", fetcher);
  const { data: plansData, mutate: mutatePlans } = useSWR("/api/plans", fetcher);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const settings = settingsData?.settings || {};
  const plans = plansData?.plans || [];

  const [form, setForm] = useState({
    gym_name: settings.gym_name || "SM FITNESS",
    address: settings.address || "",
    phone: settings.phone || "",
    upi_id: settings.upi_id || "",
    logo_url: settings.logo_url || "",
    upi_qr_url: settings.upi_qr_url || ""
  });

  // Re-sync form when swr loads
  useState(() => {
    if (settings.gym_name) setForm(settings);
  });

  const [newPlan, setNewPlan] = useState({ name: "", duration_months: 1, default_price: "" });
  const [addingPlan, setAddingPlan] = useState(false);

  async function handleAssetUpload(file: File, type: "logo" | "qr") {
    try {
      const compressed = await compressImageToJpeg(file, { maxBytes: 300 * 1024 });
      const formData = new FormData();
      formData.append("file", compressed, "image.jpg");
      formData.append("type", type);
      
      const res = await fetch("/api/settings/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Upload failed");
      
      setForm(prev => ({ ...prev, [type === "logo" ? "logo_url" : "upi_qr_url"]: data.url }));
    } catch(e: any) {
      setError(e.message);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess("Settings saved successfully");
      mutateSettings();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState({ name: "", duration_months: 1, default_price: "" });

  const startEditPlan = (plan: any) => {
    setEditPlanId(plan.id);
    setEditPlan({ name: plan.name, duration_months: plan.duration_months, default_price: plan.default_price ?? "" });
  };

  const saveEditPlan = async () => {
    if (!editPlanId) return;
    setAddingPlan(true);
    try {
      const res = await fetch(`/api/plans?id=${editPlanId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: editPlan.name,
          duration_months: Number(editPlan.duration_months),
          default_price: editPlan.default_price ? Number(editPlan.default_price) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to edit plan");
      setEditPlanId(null);
      setEditPlan({ name: "", duration_months: 1, default_price: "" });
      mutatePlans();
      toast.success("Plan updated");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingPlan(false);
    }
  };

  async function handleAddPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlan.name || !newPlan.duration_months) return;
    setAddingPlan(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newPlan.name,
          duration_months: Number(newPlan.duration_months),
          default_price: newPlan.default_price ? Number(newPlan.default_price) : null,
        }),
      });

      if(!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "Failed to add plan");
      }
      setNewPlan({ name: "", duration_months: 1, default_price: "" });
      mutatePlans();
      toast.success("Plan added");
    } catch(e: any) {
      setError(e.message);
    } finally {
      setAddingPlan(false);
    }
  }

  async function handleDeletePlan(id: string) {
    if(!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await fetch(`/api/plans?id=${id}`, { method: "DELETE" });
      mutatePlans();
    } catch(e: any) {
       setError(e.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage gym details, branding, plan options, and UPI information.</p>
      </div>

      {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div> : null}
      {success ? <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">{success}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">General Profile</h2>
            <form id="settingsForm" onSubmit={saveSettings} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800">Gym Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  value={form.gym_name}
                  onChange={(e) => setForm(f => ({ ...f, gym_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800">Phone</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800">Address</label>
                <textarea
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>

              <hr className="my-6 border-zinc-200" />
              <h2 className="text-base font-semibold text-zinc-900 mb-4">Payment Settings</h2>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800">Global UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. yourname@upi"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  value={form.upi_id}
                  onChange={(e) => setForm(f => ({ ...f, upi_id: e.target.value }))}
                />
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Plan Management</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 mb-4">
              <div className="grid grid-cols-4 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                <div className="col-span-1">Name</div>
                <div className="col-span-1 text-center">Months</div>
                <div className="col-span-1 text-center">Price (Rs)</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              {plans.map((p: any) => (
                <div key={p.id} className="grid grid-cols-4 border-t border-zinc-100 px-3 py-2 text-sm items-center">
                  <div className="col-span-1 font-medium">{p.name}</div>
                  <div className="col-span-1 text-center">{p.duration_months}</div>
                  <div className="col-span-1 text-center">{p.default_price || "-"}</div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => handleDeletePlan(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium mr-2">Delete</button>
                <button onClick={() => startEditPlan(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  </div>
                </div>
              ))}
              {plans.length === 0 && (
                <div className="p-4 text-center text-sm text-zinc-500">No plans configured</div>
              )}
            </div>

            <form onSubmit={handleAddPlan} className="grid grid-cols-4 gap-2 items-end">
        {editPlanId && (
          <div className="col-span-4 flex items-center gap-2 bg-zinc-100 p-2 rounded">
            <input type="text" value={editPlan.name} onChange={e => setEditPlan(p => ({...p, name: e.target.value}))} className="rounded border px-2 py-1" placeholder="Plan name" />
            <input type="number" min={1} value={editPlan.duration_months} onChange={e => setEditPlan(p => ({...p, duration_months: Number(e.target.value)}))} className="rounded border px-2 py-1" placeholder="Months" />
            <input type="number" min={0} value={editPlan.default_price} onChange={e => setEditPlan(p => ({...p, default_price: Number(e.target.value)}))} className="rounded border px-2 py-1" placeholder="Price" />
            <button type="button" onClick={saveEditPlan} className="rounded bg-zinc-800 text-white px-3 py-1">Save</button>
            <button type="button" onClick={() => { setEditPlanId(null); setEditPlan({ name: "", duration_months: 1, default_price: "" }); }} className="rounded bg-zinc-300 px-3 py-1">Cancel</button>
          </div>
        )}
              <div className="col-span-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-800">Plan Name</label>
                  <input type="text" required value={newPlan.name} onChange={e => setNewPlan(f => ({...f, name: e.target.value}))} className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" placeholder="e.g. Monthly" />
              </div>
              <div className="col-span-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-800">Months</label>
                  <input type="number" min={1} required value={newPlan.duration_months} onChange={e => setNewPlan(f => ({...f, duration_months: Number(e.target.value)}))} className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-800">Default RS</label>
                  <input type="number" min={0} value={newPlan.default_price} onChange={e => setNewPlan(f => ({...f, default_price: e.target.value}))} className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" placeholder="1000" />
              </div>
              <div className="col-span-1">
                  <button type="submit" disabled={addingPlan} className="w-full rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">Add</button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-2">Gym Logo</h2>
            <p className="text-xs text-zinc-500 mb-4">Displayed on receipts</p>
            {form.logo_url ? (
               <div className="mb-4 text-xs font-medium text-green-600">Logo captured (URL set)</div>
            ) : null}
            <input type="file" accept="image/*" onChange={(e) => {
              if(e.target.files?.[0]) handleAssetUpload(e.target.files[0], "logo");
            }} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-2">UPI QR Code</h2>
            <p className="text-xs text-zinc-500 mb-4">Displayed on payment page</p>
            {form.upi_qr_url ? (
               <div className="mb-4 text-xs font-medium text-green-600">QR Code captured (URL set)</div>
            ) : null}
            <input type="file" accept="image/*" onChange={(e) => {
              if(e.target.files?.[0]) handleAssetUpload(e.target.files[0], "qr");
            }} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />
          </div>

          <button form="settingsForm" type="submit" disabled={saving} className="w-full rounded-2xl bg-zinc-900 p-4 text-center text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
            {saving ? "Saving Changes..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
