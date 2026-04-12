"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInDays, format } from "date-fns";
import type { ZodIssue } from "zod";
import { addDaysIST, addMonthsIST, todayISTDateString } from "@/lib/dateUtils";
import { membershipFormSchema } from "@/lib/validations/membership.schema";

function mapIssuesToFields(issues: ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0];
    if (typeof k === "string" && out[k] === undefined) out[k] = i.message;
  }
  return out;
}

function inputClass(invalid: boolean): string {
  return [
    "w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    invalid
      ? "border-red-400 bg-red-50 focus:border-red-400 focus-visible:ring-red-200"
      : "border-zinc-200 focus:border-zinc-400 focus-visible:ring-zinc-400",
  ].join(" ");
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [datesError, setDatesError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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

  const feeNumeric = useMemo(() => {
    const t = fee.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }, [fee]);

  const feeHighWarning =
    feeNumeric != null && feeNumeric > 50_000 && feeNumeric <= 99_999;

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
    setFieldErrors({});
    setDatesError(null);
    setFormError(null);
    setWarning(null);

    const parsed = membershipFormSchema.safeParse({ plan_id: planId, fee_charged: fee });
    if (!parsed.success) {
      setFieldErrors(mapIssuesToFields(parsed.error.issues));
      return;
    }

    if (previewDates && previewDates.endStr <= previewDates.startStr) {
      setDatesError("End date must be after start date");
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
      setFormError(err instanceof Error ? err.message : "Failed to create membership");
    } finally {
      setSubmitting(false);
    }
  }

  const fe = fieldErrors;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="plan_id">
            Plan
          </label>
          <select
            id="plan_id"
            aria-invalid={!!fe.plan_id}
            className={inputClass(!!fe.plan_id)}
            value={planId}
            onChange={(e) => {
              setFieldErrors((prev) => {
                if (!prev.plan_id) return prev;
                const next = { ...prev };
                delete next.plan_id;
                return next;
              });
              setPlanId(e.target.value);
            }}
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
          {fe.plan_id ? (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <span aria-hidden>⚠</span> {fe.plan_id}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-800" htmlFor="fee_charged">
            Fee charged
          </label>
          <input
            id="fee_charged"
            inputMode="decimal"
            aria-invalid={!!fe.fee_charged}
            className={inputClass(!!fe.fee_charged)}
            value={fee}
            onChange={(e) => {
              setFieldErrors((prev) => {
                if (!prev.fee_charged) return prev;
                const next = { ...prev };
                delete next.fee_charged;
                return next;
              });
              setFee(e.target.value);
            }}
            disabled={submitting}
            placeholder="e.g. 1200"
            required
          />
          {fe.fee_charged ? (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <span aria-hidden>⚠</span> {fe.fee_charged}
            </p>
          ) : null}
          {feeHighWarning ? (
            <p className="text-xs text-amber-700">
              That seems high — double-check the amount
            </p>
          ) : null}
        </div>
      </div>

      {selected && previewLine ? (
        <p className="text-sm italic text-slate-500">{previewLine}</p>
      ) : null}

      {datesError ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <span aria-hidden>⚠</span> {datesError}
        </p>
      ) : null}

      {selected ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">
          Dates are auto-calculated based on existing active membership (if any).
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save membership"}
      </button>
    </form>
  );
}
