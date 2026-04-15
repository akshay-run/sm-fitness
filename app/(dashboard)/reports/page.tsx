"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import type { CellHookData } from "jspdf-autotable";
import {
  formatAmountINR,
  formatAmountPdfINR,
  formatDateShortIST,
  toTitleCase,
} from "@/lib/uiFormat";
import type { ReportScope } from "@/lib/dateUtils";

const PDF_MARGIN = 40;
const PDF_CONTENT_W = 515;
const PDF_HEADER_RGB: [number, number, number] = [26, 26, 46];
const PDF_CELL_PAD = { top: 4, right: 8, bottom: 4, left: 8 };
/** Payment table column widths (pt); total = 515. */
const PAY_COL_W = { member: 110, mobile: 85, date: 65, plan: 80, amount: 90, mode: 85 };
/** Plan summary table (pt); total = 515. */
const PLAN_COL_W = { plan: 145, members: 90, payments: 90, revenue: 115, avg: 75 };

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
    member_mobile: string;
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

type DocWithVfs = jsPDF & { addFileToVFS: (filename: string, data: string) => void };

function binaryStringFromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

async function embedNotoSans(doc: jsPDF): Promise<boolean> {
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch("/fonts/NotoSans-Regular.ttf"),
      fetch("/fonts/NotoSans-Bold.ttf"),
    ]);
    if (!regRes.ok || !boldRes.ok) return false;
    const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
    const vfs = doc as DocWithVfs;
    vfs.addFileToVFS("NotoSans-Regular.ttf", binaryStringFromBuffer(regBuf));
    vfs.addFileToVFS("NotoSans-Bold.ttf", binaryStringFromBuffer(boldBuf));
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal", undefined, "Identity-H");
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold", undefined, "Identity-H");
    doc.setFont("NotoSans", "normal");
    return true;
  } catch {
    return false;
  }
}

function formatAmountPdfAscii(value: number | string): string {
  const n = Number(value || 0);
  const s = n.toLocaleString("en-IN", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
  return `Rs. ${s}`;
}

function stripeBodyRow(data: CellHookData) {
  if (data.section !== "body") return;
  data.cell.styles.fillColor =
    data.row.index % 2 === 1 ? ([248, 249, 250] as [number, number, number]) : ([255, 255, 255] as [number, number, number]);
}

export default function ReportsPage() {
  const [scope, setScope] = useState<ReportScope>("this_month");
  const [gymName, setGymName] = useState("SM FITNESS");

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ["reports-summary", scope],
    queryFn: async () => {
      const res = await fetch(`/api/reports/summary?scope=${encodeURIComponent(scope)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load report");
      return json as SummaryJson;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load settings");
      return json as { gym_name?: string };
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  useEffect(() => {
    const name = settingsData?.gym_name;
    if (name) setGymName(String(name));
  }, [settingsData?.gym_name]);

  const error = queryError instanceof Error ? queryError.message : null;

  const periodLabel = useMemo(() => {
    if (!data?.period.startIST) return "All time";
    const a = data.period.startIST.slice(0, 10);
    const b = data.period.endIST ? new Date(data.period.endIST).toISOString().slice(0, 10) : "";
    return `${a} to ${b}`;
  }, [data]);

  const exportPdf = useCallback(async () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const margin = PDF_MARGIN;
    const pageW = doc.internal.pageSize.getWidth();

    const notoOk = await embedNotoSans(doc);
    const tableFont = notoOk ? "NotoSans" : "helvetica";
    const pdfAmount = (v: number | string) => (notoOk ? formatAmountPdfINR(v) : formatAmountPdfAscii(v));

    const setDocFont = (style: "normal" | "bold") => {
      if (notoOk) doc.setFont("NotoSans", style);
      else doc.setFont("helvetica", style);
    };

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

    setDocFont("bold");
    doc.setFontSize(16);
    doc.text(gymName, margin, 50);
    setDocFont("normal");
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
      theme: "plain",
      head: [["Metric", "Value"]],
      body: [
        ["Payments (count)", String(data.summary.payment_count)],
        ["Cash total", pdfAmount(data.summary.cash_total)],
        ["UPI total", pdfAmount(data.summary.upi_total)],
        ["Grand total", pdfAmount(data.summary.grand_total)],
        ["New members", String(data.summary.new_members)],
      ],
      styles: {
        font: tableFont,
        fontSize: 9,
        cellPadding: PDF_CELL_PAD,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      headStyles: {
        font: tableFont,
        fontStyle: "bold",
        fontSize: 9,
        fillColor: PDF_HEADER_RGB,
        textColor: 255,
        cellPadding: PDF_CELL_PAD,
      },
      columnStyles: {
        0: { cellWidth: 300, halign: "left" },
        1: { cellWidth: 215, halign: "right" },
      },
      didParseCell: (hook) => {
        stripeBodyRow(hook);
        if (hook.section === "head") {
          hook.cell.styles.halign = hook.column.index === 0 ? "left" : "right";
          hook.cell.styles.fontStyle = "bold";
        }
        if (hook.section === "body") {
          hook.cell.styles.halign = hook.column.index === 0 ? "left" : "right";
          if (hook.column.index === 1) hook.cell.styles.fontStyle = "bold";
        }
      },
      tableWidth: PDF_CONTENT_W,
      margin: { left: margin, right: margin },
    });

    let yAfter =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    autoTable(doc, {
      startY: yAfter,
      theme: "plain",
      head: [["Member", "Mobile", "Date", "Plan", "Amount", "Mode"]],
      body: data.payments.map((p) => [
        toTitleCase(p.member_name),
        p.member_mobile || "—",
        formatDateShortIST(p.payment_date),
        p.plan_name,
        pdfAmount(p.amount),
        p.mode.toUpperCase(),
      ]),
      styles: {
        font: tableFont,
        fontSize: 8,
        cellPadding: PDF_CELL_PAD,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      headStyles: {
        font: tableFont,
        fontStyle: "bold",
        fontSize: 8,
        fillColor: PDF_HEADER_RGB,
        textColor: 255,
        cellPadding: PDF_CELL_PAD,
      },
      columnStyles: {
        0: { cellWidth: PAY_COL_W.member, halign: "left" },
        1: { cellWidth: PAY_COL_W.mobile, halign: "left" },
        2: { cellWidth: PAY_COL_W.date, halign: "left" },
        3: { cellWidth: PAY_COL_W.plan, halign: "left" },
        4: { cellWidth: PAY_COL_W.amount, halign: "right" },
        5: { cellWidth: PAY_COL_W.mode, halign: "left" },
      },
      didParseCell: (hook) => {
        stripeBodyRow(hook);
        if (hook.section === "head" && hook.column.index === 4) hook.cell.styles.halign = "right";
        if (hook.section === "head" && hook.column.index === 5) {
          hook.cell.styles.halign = "left";
          hook.cell.styles.cellPadding = { top: 4, right: 8, bottom: 4, left: 8 };
        }
        if (hook.section === "body" && hook.column.index === 4) {
          hook.cell.styles.halign = "right";
          hook.cell.styles.cellPadding = { top: 4, right: 8, bottom: 4, left: 8 };
        }
        if (hook.section === "body" && hook.column.index === 5) {
          hook.cell.styles.halign = "left";
          hook.cell.styles.cellPadding = { top: 4, right: 8, bottom: 4, left: 8 };
        }
      },
      tableWidth: PDF_CONTENT_W,
      margin: { left: margin, right: margin },
    });

    yAfter =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    if (data.plan_breakdown.length > 0) {
      const planBody = data.plan_breakdown.map((r) => [
        r.plan_name,
        String(r.member_count),
        String(r.payment_count),
        pdfAmount(r.revenue),
        r.member_count > 0 ? pdfAmount(r.revenue / r.member_count) : "—",
      ]);
      const totalMembers = data.plan_breakdown.reduce((s, r) => s + r.member_count, 0);
      const totalPayments = data.plan_breakdown.reduce((s, r) => s + r.payment_count, 0);
      const totalRevenue = data.plan_breakdown.reduce((s, r) => s + r.revenue, 0);
      planBody.push([
        "Total",
        String(totalMembers),
        String(totalPayments),
        pdfAmount(totalRevenue),
        totalMembers > 0 ? pdfAmount(totalRevenue / totalMembers) : "—",
      ]);
      const lastPlanRowIndex = planBody.length - 1;

      autoTable(doc, {
        startY: yAfter,
        theme: "plain",
        head: [["Plan", "Members", "Payments", "Revenue (INR)", "Avg Fee"]],
        body: planBody,
        styles: {
          font: tableFont,
          fontSize: 8,
          cellPadding: PDF_CELL_PAD,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
        },
        headStyles: {
          font: tableFont,
          fontStyle: "bold",
          fontSize: 8,
          fillColor: PDF_HEADER_RGB,
          textColor: 255,
          cellPadding: PDF_CELL_PAD,
        },
        columnStyles: {
          0: { cellWidth: PLAN_COL_W.plan, halign: "left" },
          1: { cellWidth: PLAN_COL_W.members, halign: "left" },
          2: { cellWidth: PLAN_COL_W.payments, halign: "left" },
          3: { cellWidth: PLAN_COL_W.revenue, halign: "right" },
          4: { cellWidth: PLAN_COL_W.avg, halign: "right" },
        },
        didParseCell: (hook) => {
          stripeBodyRow(hook);
          if (hook.section === "head" && (hook.column.index === 3 || hook.column.index === 4)) {
            hook.cell.styles.halign = "right";
          }
          if (hook.section === "body" && hook.column.index === 3) hook.cell.styles.halign = "right";
          if (hook.section === "body" && hook.column.index === 4) hook.cell.styles.halign = "right";
          if (hook.section === "body" && hook.row.index === lastPlanRowIndex) {
            hook.cell.styles.fontStyle = "bold";
            hook.cell.styles.fillColor = [255, 255, 255];
          }
        },
        tableWidth: PDF_CONTENT_W,
        margin: { left: margin, right: margin },
      });
    }

    const totalPages = doc.getNumberOfPages();
    const pageH = doc.internal.pageSize.getHeight();
    const footerText = (i: number) =>
      `SM FITNESS | Generated by SM FITNESS Admin App | Page ${i} of ${totalPages}`;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      setDocFont("normal");
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      doc.text(footerText(i), margin, pageH - 16, {
        maxWidth: pageW - margin * 2,
      });
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`sm-fitness-report-${scope}.pdf`);
  }, [data, gymName, scope]);

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
            onClick={() => void exportPdf()}
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

      {!data && loading ? (
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
              <EmptyState title="No data" message="No payment data for this period." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-medium text-zinc-500">
                      <th className="py-2 pr-2">Member</th>
                      <th className="py-2 pr-2">Mobile</th>
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
                        <td className="py-2 pr-2 text-zinc-600">{p.member_mobile || "—"}</td>
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

      {isFetching && data ? (
        <div className="mt-2 text-xs text-zinc-500">Refreshing report…</div>
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
