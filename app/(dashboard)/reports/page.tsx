"use client";

import { useEffect, useState } from "react";

type RevenueRow = {
  month: string;
  total: number;
  cash_total: number;
  upi_total: number;
  count: number;
};

export default function ReportsPage() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/reports/revenue", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load report");
        if (!cancelled) setRows(json.rows ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Export member list and review monthly revenue.
          </p>
        </div>
        <a
          href="/api/reports/members-csv"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Free tier has no automatic backup. Export member data monthly.
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Monthly revenue summary</h2>

        {loading ? (
          <div className="mt-4 text-sm text-zinc-600">Loading...</div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
              <div className="col-span-3">Month</div>
              <div className="col-span-2">Payments</div>
              <div className="col-span-2">Cash</div>
              <div className="col-span-2">UPI</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            {rows.length ? (
              rows.map((r) => (
                <div
                  key={r.month}
                  className="grid grid-cols-12 gap-2 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                >
                  <div className="col-span-3 font-medium">{r.month}</div>
                  <div className="col-span-2">{r.count}</div>
                  <div className="col-span-2">₹{r.cash_total.toFixed(0)}</div>
                  <div className="col-span-2">₹{r.upi_total.toFixed(0)}</div>
                  <div className="col-span-3 text-right font-semibold">
                    ₹{r.total.toFixed(0)}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-sm text-zinc-600">No payment data yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

