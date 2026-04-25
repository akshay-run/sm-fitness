"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueMiniChart({
  data,
}: {
  data: Array<{ month: string; total: number }>;
}) {
  return (
    <div className="mt-4 h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#71717a" />
          <YAxis tick={{ fontSize: 9 }} stroke="#71717a" width={36} />
          <Tooltip
            formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
            contentStyle={{
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: 8,
              fontSize: 11,
            }}
          />
          <Bar dataKey="total" fill="#2563eb" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
