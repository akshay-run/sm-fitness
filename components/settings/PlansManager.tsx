"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PlanRow = {
  id: string;
  name: string;
  duration_months: number;
  default_price: number | null;
  is_active: boolean;
};

const desktopGrid =
  "md:grid md:grid-cols-[minmax(0,35%)_minmax(0,15%)_minmax(0,15%)_minmax(0,15%)_minmax(0,20%)] md:items-center md:gap-2";

function validatePlanDuration(months: number): string | null {
  if (!Number.isFinite(months) || months < 1) {
    return "Plan duration must be at least 1 month";
  }
  if (months > 36) {
    return "Plan duration cannot exceed 36 months";
  }
  return null;
}

function inputInvalidClass(invalid: boolean): string {
  return invalid ? "border-red-400 bg-red-50" : "border-zinc-200";
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      Active
    </span>
  ) : (
    <span className="inline-flex shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      Inactive
    </span>
  );
}

export function PlansManager() {
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [months, setMonths] = useState("1");
  const [monthsError, setMonthsError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["plans", "manage"],
    queryFn: async () => {
      const res = await fetch("/api/plans?scope=manage", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load plans");
      return json as { plans?: PlanRow[] };
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data) return;
    setPlans(data.plans ?? []);
    setLoading(false);
  }, [data]);

  const load = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["plans", "manage"] });
  }, [queryClient]);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setPriceError(null);
    if (name.trim() === "") {
      setNameError("Plan name is required");
      return;
    }
    const m = Number(months);
    if (!Number.isFinite(m) || m < 1) {
      setMonthsError("Plan duration must be at least 1 month");
      return;
    }
    if (m > 36) {
      setMonthsError("Plan duration cannot exceed 36 months");
      return;
    }
    setMonthsError(null);
    const dp = price.trim() === "" ? null : Number(price);
    if (price.trim() !== "" && (dp === null || Number.isNaN(dp))) {
      setPriceError("Please enter a valid fee amount");
      return;
    }
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          duration_months: m,
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
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
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
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
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
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
      <h2 className="text-lg font-semibold text-zinc-900">Plans</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Duration defines membership length. Fee is a hint when assigning a membership.
      </p>

      <form onSubmit={addPlan} className="card-surface mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm font-medium text-zinc-800">Add plan</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <input
              className={`rounded-lg border px-3 py-2 text-sm ${inputInvalidClass(!!nameError)}`}
              placeholder="Name"
              value={name}
              aria-invalid={!!nameError}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
            />
            {nameError ? <p className="text-xs text-red-600">{nameError}</p> : null}
          </div>
          <div className="space-y-1">
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              type="number"
              min={1}
              max={36}
              placeholder="Months"
              value={months}
              onChange={(e) => {
                const v = e.target.value;
                setMonths(v);
                const n = Number(v);
                if (v !== "" && Number.isFinite(n) && n < 1) {
                  setMonthsError("Plan duration must be at least 1 month");
                } else if (Number.isFinite(n) && n > 36) {
                  setMonthsError("Plan duration cannot exceed 36 months");
                } else {
                  setMonthsError(null);
                }
              }}
              required
            />
            {monthsError ? <p className="text-xs text-red-600">{monthsError}</p> : null}
          </div>
          <div className="space-y-1">
            <input
              className={`rounded-lg border px-3 py-2 text-sm ${inputInvalidClass(!!priceError)}`}
              type="number"
              min={0}
              step="0.01"
              placeholder="Fee (optional)"
              value={price}
              aria-invalid={!!priceError}
              onChange={(e) => {
                setPrice(e.target.value);
                if (priceError) setPriceError(null);
              }}
            />
            {priceError ? <p className="text-xs text-red-600">{priceError}</p> : null}
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add plan
        </button>
      </form>

      <div className="card-surface mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">Loading…</div>
        ) : plans.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">No plans yet.</div>
        ) : (
          <>
            <div
              className={`hidden border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600 ${desktopGrid}`}
            >
              <div className="truncate">Name</div>
              <div>Months</div>
              <div>Fee</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="md:divide-y md:divide-zinc-100">
              {plans.map((p) => (
                <PlanRowItem
                  key={editingId === p.id ? `${p.id}-editing` : p.id}
                  plan={p}
                  editing={editingId === p.id}
                  onEdit={() => setEditingId(p.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={saveEdit}
                  onDeactivate={deactivate}
                  desktopGrid={desktopGrid}
                  validateDuration={validatePlanDuration}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlanRowItem({
  plan,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDeactivate,
  desktopGrid,
  validateDuration,
}: {
  plan: PlanRow;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (p: PlanRow) => void;
  onDeactivate: (id: string) => void;
  desktopGrid: string;
  validateDuration: (months: number) => string | null;
}) {
  const [draft, setDraft] = useState(plan);
  const [durationError, setDurationError] = useState<string | null>(null);

  function trySave() {
    const err = validateDuration(draft.duration_months);
    if (err) {
      setDurationError(err);
      return;
    }
    setDurationError(null);
    onSave(draft);
  }

  const feeLabel = plan.default_price != null ? `₹${plan.default_price}` : "—";

  if (editing) {
    return (
      <div className="border-b border-zinc-100 last:border-b-0">
        <div className="md:hidden space-y-3 p-4">
          <div className="text-sm font-medium text-zinc-800">Edit plan</div>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="space-y-1">
            <input
              type="number"
              min={1}
              max={36}
              aria-invalid={!!durationError}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${inputInvalidClass(!!durationError)}`}
              value={draft.duration_months}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraft({ ...draft, duration_months: n });
                if (durationError) setDurationError(null);
              }}
            />
            {durationError ? <p className="text-xs text-red-600">{durationError}</p> : null}
          </div>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Fee"
            value={draft.default_price ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                default_price: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <div className="flex items-center gap-2">
            <StatusBadge active={plan.is_active} />
          </div>
          <div className="flex gap-2">
            <button type="button" className="text-sm underline" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white"
              onClick={trySave}
            >
              Save
            </button>
          </div>
        </div>
        <div className={`hidden px-4 py-3 text-sm ${desktopGrid}`}>
          <div className="min-w-0 overflow-hidden">
            <input
              className="w-full min-w-0 rounded border border-zinc-200 px-2 py-1 text-sm"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <input
              type="number"
              min={1}
              max={36}
              aria-invalid={!!durationError}
              className={`w-full rounded border px-2 py-1 text-sm ${inputInvalidClass(!!durationError)}`}
              value={draft.duration_months}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraft({ ...draft, duration_months: n });
                if (durationError) setDurationError(null);
              }}
            />
            {durationError ? <p className="text-xs text-red-600">{durationError}</p> : null}
          </div>
          <div>
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
          <div className="truncate">
            <StatusBadge active={plan.is_active} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="text-xs underline" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
              onClick={trySave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <div className="flex flex-col gap-3 p-4 md:hidden">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="font-semibold text-zinc-900">{plan.name}</div>
          <StatusBadge active={plan.is_active} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
          <span>{plan.duration_months} months</span>
          <span aria-hidden>·</span>
          <span>{feeLabel}</span>
        </div>
        {plan.is_active ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="text-xs underline" onClick={onEdit}>
              Edit
            </button>
            <button
              type="button"
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
              onClick={() => onDeactivate(plan.id)}
            >
              Deactivate
            </button>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </div>

      <div className={`hidden px-4 py-3 text-sm ${desktopGrid}`}>
        <div className="truncate font-medium text-zinc-900">{plan.name}</div>
        <div>{plan.duration_months}</div>
        <div className="truncate">{feeLabel}</div>
        <div className="min-w-0 overflow-hidden">
          <StatusBadge active={plan.is_active} />
        </div>
        <div className="flex justify-end gap-2 overflow-hidden">
          {plan.is_active ? (
            <>
              <button type="button" className="shrink-0 text-xs underline" onClick={onEdit}>
                Edit
              </button>
              <button
                type="button"
                className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600"
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
    </div>
  );
}
