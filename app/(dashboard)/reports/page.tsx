"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import Papa from "papaparse";
import { formatAmountINR, formatDateShortIST } from "@/lib/uiFormat";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import ReportsLoading from "./loading";

// Use same date bounding logic for scopes
function getScopeBounds(scope: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  let start = new Date(0); // All Time
  let end = new Date("2100-01-01");

  if (scope === "This Month") {
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0, 23, 59, 59);
  } else if (scope === "Last Month") {
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0, 23, 59, 59);
  } else if (scope === "This Quarter") {
    const qStartMonth = Math.floor(month / 3) * 3;
    start = new Date(year, qStartMonth, 1);
    end = new Date(year, qStartMonth + 3, 0, 23, 59, 59);
  } else if (scope === "Last Quarter") {
    const qStartMonth = Math.floor(month / 3) * 3;
    start = new Date(year, qStartMonth - 3, 1);
    end = new Date(year, qStartMonth, 0, 23, 59, 59);
  }
  return { start, end };
}

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR("/api/reports/full", (url) =>
    fetch(url).then((res) => res.json())
  );
  
  const [scope, setScope] = useState("This Month");

  const filteredData = useMemo(() => {
    if (!data?.payments) return { payments: [], summary: { count: 0, cash: 0, upi: 0, total: 0 }, planBreakdown: [], growth: [] };

    const { start, end } = getScopeBounds(scope);
    
    // Filter payments
    const payments = data.payments.filter((p: any) => {
      const pDate = new Date(p.payment_date);
      return pDate >= start && pDate <= end;
    });

    // Summary
    const summary = payments.reduce((acc: any, p: any) => {
      const amnt = Number(p.amount);
      acc.total += amnt;
      acc.count += 1;
      if (p.payment_mode === "cash") acc.cash += amnt;
      if (p.payment_mode === "upi") acc.upi += amnt;
      return acc;
    }, { count: 0, cash: 0, upi: 0, total: 0 });

    // Plan breakdown
    const planMap = new Map();
    for (const p of payments) {
      const planName = p.plan_name;
      const current = planMap.get(planName) || { members: 0, revenue: 0 };
      current.members += 1;
      current.revenue += Number(p.amount);
      planMap.set(planName, current);
    }
    const planBreakdown = Array.from(planMap.entries()).map(([name, stats]) => ({
      name,
      members: stats.members,
      revenue: stats.revenue,
    }));

    // Growth (by month) based on members joined date
    // Calculate new members joined per month within scope (or simply globally up to end date to show curve)
    // Actually, "total members per month" requires calculating running total. For simplicity, we just count "Joined per month" during the selected period or in last 6 months.
    const joinedMap = new Map();
    for (const m of data.members || []) {
       if(!m.joining_date) continue;
       const jDate = new Date(m.joining_date);
       if (jDate >= start && jDate <= end) {
          const monthKey = jDate.toLocaleString('default', { month: 'short', year: 'numeric' });
          joinedMap.set(monthKey, (joinedMap.get(monthKey) || 0) + 1);
       }
    }
    const growth = Array.from(joinedMap.entries()).map(([month, count]) => ({ month, count })).reverse();
    
    return { payments, summary, planBreakdown, growth };
  }, [data, scope]);

  if (isLoading) return <ReportsLoading />;
  if (error || data?.error) return <div className="p-6 text-red-500">Failed to load reports</div>;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("SM FITNESS - Revenue Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${scope}`, 14, 30);
    doc.text(`Total Revenue: Rs. ${filteredData.summary.total}`, 14, 36);
    doc.text(`Payments Count: ${filteredData.summary.count}`, 14, 42);

    const tableData = filteredData.payments.map((p: any) => [
      formatDateShortIST(p.payment_date),
      p.receipt_number,
      p.member_name,
      p.plan_name,
      p.payment_mode.toUpperCase(),
      `Rs. ${Number(p.amount)}`
    ]);

    (doc as any).autoTable({
      startY: 50,
      head: [['Date', 'Receipt', 'Member', 'Plan', 'Mode', 'Amount']],
      body: tableData,
    });

    doc.save(`sm-fitness-report-${scope.replace(' ', '-')}.pdf`);
  };

  const exportCSV = () => {
    const csvHeader = ["Date", "Receipt", "Member", "Plan", "Mode", "Amount"];
    const csvData = filteredData.payments.map((p: any) => [
      formatDateShortIST(p.payment_date),
      p.receipt_number,
      p.member_name,
      p.plan_name,
      p.payment_mode.toUpperCase(),
      Number(p.amount)
    ]);
    const csv = Papa.unparse([csvHeader, ...csvData]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sm-fitness-report-${scope.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600">Review revenue and member growth.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
          >
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="Last Quarter">Last Quarter</option>
            <option value="All Time">All Time</option>
          </select>
          <button onClick={exportPDF} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            Export PDF
          </button>
          <button onClick={exportCSV} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-surface rounded-2xl border border-zinc-200 p-4">
          <div className="text-xs font-medium text-slate-500">Total Revenue</div>
          <div className="mt-2 text-2xl font-semibold">{formatAmountINR(filteredData.summary.total)}</div>
        </div>
        <div className="card-surface rounded-2xl border border-zinc-200 p-4">
          <div className="text-xs font-medium text-slate-500">Payments Count</div>
          <div className="mt-2 text-2xl font-semibold">{filteredData.summary.count}</div>
        </div>
        <div className="card-surface rounded-2xl border border-zinc-200 p-4">
          <div className="text-xs font-medium text-slate-500">Cash Collection</div>
          <div className="mt-2 text-2xl font-semibold text-green-700">{formatAmountINR(filteredData.summary.cash)}</div>
        </div>
        <div className="card-surface rounded-2xl border border-zinc-200 p-4">
          <div className="text-xs font-medium text-slate-500">UPI Collection</div>
          <div className="mt-2 text-2xl font-semibold text-blue-700">{formatAmountINR(filteredData.summary.upi)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-surface rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">Plan-wise Breakdown</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <div className="grid grid-cols-3 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
              <div>Plan</div>
              <div className="text-center">Renewals</div>
              <div className="text-right">Revenue</div>
            </div>
            {filteredData.planBreakdown.length > 0 ? (
               filteredData.planBreakdown.map((p, i) => (
                <div key={i} className="grid grid-cols-3 border-t border-zinc-100 px-3 py-2 text-sm hover:bg-zinc-50">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-center">{p.members}</div>
                  <div className="text-right">{formatAmountINR(p.revenue)}</div>
                </div>
               ))
            ) : (
               <div className="p-4 text-center text-sm text-zinc-500">No data for selected period</div>
            )}
          </div>
        </div>

        <div className="card-surface rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">New Joinees</h2>
          <div className="mt-4 h-[250px] w-full">
            {filteredData.growth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717A" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717A" }} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: "#F4F4F5" }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E4E7' }} />
                  <Bar dataKey="count" fill="#1A1A2E" radius={[4, 4, 0, 0]} name="New Members" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500 border border-dashed rounded-xl">No joinee data for selected period</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 card-surface rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Payments Ledger</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <div className="grid grid-cols-12 gap-2 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Receipt</div>
            <div className="col-span-3">Member</div>
            <div className="col-span-2">Plan</div>
            <div className="col-span-1">Mode</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {filteredData.payments.length ? (
            filteredData.payments.map((p: any, i: number) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 border-t border-zinc-100 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 whitespace-nowrap"
              >
                <div className="col-span-2">{formatDateShortIST(p.payment_date)}</div>
                <div className="col-span-2 text-zinc-500">#{p.receipt_number}</div>
                <div className="col-span-3 truncate font-medium">{p.member_name}</div>
                <div className="col-span-2 truncate">{p.plan_name}</div>
                <div className="col-span-1 uppercase text-zinc-500">{p.payment_mode}</div>
                <div className="col-span-2 text-right font-medium">
                  {formatAmountINR(Number(p.amount))}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-slate-500 flex flex-col items-center">
              <span className="text-2xl mb-2">📭</span>
              No payments found for selected scope.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
