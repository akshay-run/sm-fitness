"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type PlanRow = {
  id: string;
  name: string;
  duration_months: number;
  default_price: number | null;
  is_active: boolean;
};

export function PlansManager() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [months, setMonths] = useState("1");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plans?scope=manage", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load plans");
      setPlans(json.plans ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    const dp = price.trim() === "" ? null : Number(price);
    if (price.trim() !== "" && Number.isNaN(dp)) {
      toast.error("Invalid default price");
      return;
    }
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          duration_months: Number(months),
          default_price: dp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to add");
      toast.success("Plan created");
      setName("");
      setMonths("1");
      setPrice("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function saveEdit(p: PlanRow) {
    const dp = p.default_price;
    try {
      const res = await fetch(`/api/plans/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          duration_months: p.duration_months,
          default_price: dp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");
      toast.success("Plan updated");
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this plan? It will be hidden from new memberships.")) return;
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      toast.success("Plan deactivated");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
      <h2 className="text-lg font-semibold text-zinc-900">Plans</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Duration defines membership length. Default price is a hint when assigning a membership.
      </p>

      <form onSubmit={addPlan} className="card-surface mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-medium text-zinc-800">Add plan</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            type="number"
            min={1}
            placeholder="Months"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            type="number"
            min={0}
            step="0.01"
            placeholder="Default ₹ (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add plan
        </button>
      </form>

      <div className="card-surface mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Months</div>
          <div className="col-span-2">Default ₹</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">Loading…</div>
        ) : plans.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">No plans yet.</div>
        ) : (
          plans.map((p) => (
            <PlanRowEditor
              key={p.id}
              plan={p}
              editing={editingId === p.id}
              onEdit={() => setEditingId(p.id)}
              onCancel={() => setEditingId(null)}
              onSave={saveEdit}
              onDeactivate={deactivate}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PlanRowEditor({
  plan,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDeactivate,
}: {
  plan: PlanRow;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (p: PlanRow) => void;
  onDeactivate: (id: string) => void;
}) {
  const [draft, setDraft] = useState(plan);

  useEffect(() => {
    setDraft(plan);
  }, [plan]);

  if (editing) {
    return (
      <div className="grid grid-cols-12 gap-2 border-b border-zinc-100 px-4 py-3 text-sm">
        <div className="col-span-4">
          <input
            className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            min={1}
            className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            value={draft.duration_months}
            onChange={(e) => setDraft({ ...draft, duration_months: Number(e.target.value) })}
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            value={draft.default_price ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                default_price: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <div className="col-span-2 text-zinc-600">{plan.is_active ? "Active" : "Inactive"}</div>
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className="text-xs underline" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
            onClick={() => onSave(draft)}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-2 border-b border-zinc-100 px-4 py-3 text-sm">
      <div className="col-span-4 font-medium">{plan.name}</div>
      <div className="col-span-2">{plan.duration_months}</div>
      <div className="col-span-2">{plan.default_price != null ? `₹${plan.default_price}` : "—"}</div>
      <div className="col-span-2">{plan.is_active ? "Active" : "Inactive"}</div>
      <div className="col-span-2 flex justify-end gap-2">
        {plan.is_active ? (
          <>
            <button type="button" className="text-xs underline" onClick={onEdit}>
              Edit
            </button>
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => onDeactivate(plan.id)}
            >
              Deactivate
            </button>
          </>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </div>
    </div>
  );
}
