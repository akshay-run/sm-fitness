"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInDays, format } from "date-fns";
import { z } from "zod";
import { addDaysIST, addMonthsIST, todayISTDateString } from "@/lib/dateUtils";

const schema = z.object({
  plan_id: z.string().uuid("Select a plan"),
  fee_charged: z.coerce
    .number()
    .positive("Enter a valid fee")
    .max(99_999, "Fee must be at most 99999"),
});

type Plan = { id: string; name: string; duration_months: number; default_price?: number | null };

export function MembershipForm({
  memberId,
  plans,
  latestActiveEndDate,
  onCreated,
}: {
  memberId: string;
  plans: Plan[];
  latestActiveEndDate: string | null;
  onCreated: (created: { id: string; start_date: string; end_date: string }) => void;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [fee, setFee] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const selected = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId]
  );

  const previewDates = useMemo(() => {
    if (!selected) return null;
    const startStr = latestActiveEndDate ? addDaysIST(latestActiveEndDate, 1) : todayISTDateString();
    const endStr = addMonthsIST(startStr, selected.duration_months);
    return { startStr, endStr };
  }, [latestActiveEndDate, selected]);

  const previewLine = useMemo(() => {
    if (!previewDates) return null;
    const start = new Date(`${previewDates.startStr}T12:00:00+05:30`);
    const end = new Date(`${previewDates.endStr}T12:00:00+05:30`);
    const durationDays = differenceInDays(end, start);
    return `Membership will run from ${format(start, "d MMM yyyy")} to ${format(end, "d MMM yyyy")} (${durationDays} days)`;
  }, [previewDates]);

  useEffect(() => {
    if (!planId && plans[0]?.id) setPlanId(plans[0].id);
  }, [planId, plans]);

  useEffect(() => {
    const p = plans.find((x) => x.id === planId);
    if (p?.default_price != null && p.default_price > 0) {
      setFee(String(Math.round(p.default_price)));
    }
  }, [planId, plans]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);

    const parsed = schema.safeParse({ plan_id: planId, fee_charged: fee });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    if (previewDates && previewDates.endStr <= previewDates.startStr) {
      setError("Invalid dates — please contact support");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          plan_id: parsed.data.plan_id,
          fee_charged: parsed.data.fee_charged,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to create membership");

      if (json?.warning_active_until) {
        setWarning(
          `This member already had an active membership until ${json.warning_active_until}. New membership starts after that date.`
        );
      }

      onCreated({ id: json.id, start_date: json.start_date, end_date: json.end_date });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create membership");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="plan_id">
            Plan
          </label>
          <select
            id="plan_id"
            aria-invalid={!!error}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            disabled={submitting}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.duration_months} mo)
                {p.default_price != null && p.default_price > 0
                  ? ` — default ₹${p.default_price}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="fee_charged">
            Fee charged
          </label>
          <input
            id="fee_charged"
            inputMode="decimal"
            aria-invalid={!!error}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            disabled={submitting}
            placeholder="e.g. 1200"
            required
          />
        </div>
      </div>

      {selected && previewLine ? (
        <p className="text-sm italic text-slate-500">{previewLine}</p>
      ) : null}

      {selected ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          Dates are auto-calculated based on existing active membership (if any).
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create membership"}
      </button>
    </form>
  );
}
