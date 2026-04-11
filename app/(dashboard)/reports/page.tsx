"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAmountINR, formatAmountPdfINR, formatDateShortIST } from "@/lib/uiFormat";
import type { ReportScope } from "@/lib/dateUtils";

const SCOPE_OPTIONS: { value: ReportScope; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "all_time", label: "All time" },
];

type SummaryJson = {
  scope: ReportScope;
  period: { startIST: string | null; endIST: string | null };
  summary: {
    payment_count: number;
    cash_total: number;
    upi_total: number;
    grand_total: number;
    new_members: number;
  };
  payments: Array<{
    id: string;
    member_name: string;
    payment_date: string;
    plan_name: string;
    amount: number;
    mode: string;
  }>;
  plan_breakdown: Array<{
    plan_id: string;
    plan_name: string;
    revenue: number;
    payment_count: number;
    member_count: number;
  }>;
  member_growth: Array<{ month: string; total_members: number }>;
};

export default function ReportsPage() {
  const [scope, setScope] = useState<ReportScope>("this_month");
  const [data, setData] = useState<SummaryJson | null>(null);
  const [gymName, setGymName] = useState("SM FITNESS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, setRes] = await Promise.all([
        fetch(`/api/reports/summary?scope=${encodeURIComponent(scope)}`, { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      const json = await sumRes.json();
      if (!sumRes.ok) throw new Error(json?.error ?? "Failed to load report");
      setData(json);
      const sj = await setRes.json();
      if (setRes.ok && sj.gym_name) setGymName(String(sj.gym_name));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = useMemo(() => {
    if (!data?.period.startIST) return "All time";
    const a = data.period.startIST.slice(0, 10);
    const b = data.period.endIST ? new Date(data.period.endIST).toISOString().slice(0, 10) : "";
    return `${a} to ${b}`;
  }, [data]);

  function exportPdf() {
    if (!data) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const margin = 40;
    const pageW = doc.internal.pageSize.getWidth();

    const scopeTitle = SCOPE_OPTIONS.find((o) => o.value === data.scope)?.label ?? data.scope;
    const periodLine =
      data.period.startIST && data.period.endIST
        ? `Period (IST): ${data.period.startIST.slice(0, 10)} to ${new Date(data.period.endIST).toISOString().slice(0, 10)}`
        : "Period: all recorded data";

    const generated = `Generated: ${new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    })} IST`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(gymName, margin, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Payment report", margin, 68);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(scopeTitle, margin, 84);
    doc.text(periodLine, margin, 98);
    doc.text(generated, margin, 112);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 128,
      head: [["Metric", "Value"]],
      body: [
        ["Payments (count)", String(data.summary.payment_count)],
        ["Cash total", formatAmountPdfINR(data.summary.cash_total)],
        ["UPI total", formatAmountPdfINR(data.summary.upi_total)],
        ["Grand total", formatAmountPdfINR(data.summary.grand_total)],
        ["New members in period", String(data.summary.new_members)],
      ],
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: (pageW - margin * 2) * 0.55 },
        1: { halign: "right", fontStyle: "bold" },
      },
      theme: "striped",
      tableWidth: pageW - margin * 2,
      margin: { left: margin, right: margin },
    });

    let yAfter =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    autoTable(doc, {
      startY: yAfter,
      head: [["Member", "Date", "Plan", "Amount (INR)", "Mode"]],
      body: data.payments.map((p) => [
        p.member_name,
        formatDateShortIST(p.payment_date),
        p.plan_name,
        formatAmountPdfINR(p.amount),
        p.mode.toUpperCase(),
      ]),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        3: { halign: "right" },
      },
      tableWidth: pageW - margin * 2,
      margin: { left: margin, right: margin },
    });

    yAfter =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    if (data.plan_breakdown.length > 0) {
      autoTable(doc, {
        startY: yAfter,
        head: [["Plan", "Members", "Payments", "Revenue (INR)"]],
        body: data.plan_breakdown.map((r) => [
          r.plan_name,
          String(r.member_count),
          String(r.payment_count),
          formatAmountPdfINR(r.revenue),
        ]),
        styles: { font: "helvetica", fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          3: { halign: "right" },
        },
        tableWidth: pageW - margin * 2,
        margin: { left: margin, right: margin },
      });
    }

    const totalPages = doc.getNumberOfPages();
    const pageH = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`Page ${i} of ${totalPages}`, margin, pageH - 16);
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`sm-fitness-report-${scope}.pdf`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Revenue, payments, plan mix, and member growth for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPdf}
            disabled={!data || loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600" htmlFor="scope">
            Period
          </label>
          <select
            id="scope"
            className="w-full min-w-[200px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm sm:w-auto"
            value={scope}
            onChange={(e) => setScope(e.target.value as ReportScope)}
          >
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {data?.period.startIST ? (
          <p className="text-xs text-zinc-500">{periodLabel} (IST)</p>
        ) : (
          <p className="text-xs text-zinc-500">All recorded data</p>
        )}
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-zinc-600">Loading…</div>
      ) : error ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Payments" value={String(data.summary.payment_count)} />
            <Stat label="Cash" value={formatAmountINR(data.summary.cash_total)} />
            <Stat label="UPI" value={formatAmountINR(data.summary.upi_total)} />
            <Stat label="Total" value={formatAmountINR(data.summary.grand_total)} emphasize />
            <Stat label="New members" value={String(data.summary.new_members)} />
          </div>

          <div className="card-surface mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Payments</h2>
            {data.payments.length === 0 ? (
              <EmptyState title="No payments" message="No payments in this period." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500">
                      <th className="py-2 pr-2">Member</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Plan</th>
                      <th className="py-2 pr-2">Amount</th>
                      <th className="py-2">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2 font-medium">{p.member_name}</td>
                        <td className="py-2 pr-2 text-zinc-600">
                          {formatDateShortIST(p.payment_date)}
                        </td>
                        <td className="py-2 pr-2">{p.plan_name}</td>
                        <td className="py-2 pr-2">{formatAmountINR(p.amount)}</td>
                        <td className="py-2 uppercase text-zinc-700">{p.mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-surface mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Plan breakdown</h2>
            {data.plan_breakdown.length === 0 ? (
              <EmptyState title="No plan data" message="No plan-linked payments in this period." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500">
                      <th className="py-2 pr-2">Plan</th>
                      <th className="py-2 pr-2">Members</th>
                      <th className="py-2 pr-2">Payments</th>
                      <th className="py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.plan_breakdown.map((r) => (
                      <tr key={r.plan_id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2 font-medium">{r.plan_name}</td>
                        <td className="py-2 pr-2">{r.member_count}</td>
                        <td className="py-2 pr-2">{r.payment_count}</td>
                        <td className="py-2">{formatAmountINR(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-surface mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">Member growth (last 12 months)</h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.member_growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e4e4e7",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total_members" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tracking-tight text-zinc-900 ${emphasize ? "text-xl" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-12 text-center">
      <div className="text-2xl">📭</div>
      <div className="mt-2 text-sm font-medium text-zinc-800">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-zinc-500">{message}</div>
    </div>
  );
}
