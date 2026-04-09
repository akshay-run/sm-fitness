import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { formatInTimeZone } from "date-fns-tz";
import { IST_TZ } from "@/lib/dateUtils";

function monthKeyFromDate(date: string) {
  return formatInTimeZone(new Date(date), IST_TZ, "yyyy-MM");
}

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("payments")
    .select("payment_date, amount, payment_mode")
    .order("payment_date", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const map = new Map<
    string,
    { month: string; total: number; cash_total: number; upi_total: number; count: number }
  >();

  for (const p of data ?? []) {
    const month = monthKeyFromDate(String(p.payment_date));
    const current = map.get(month) ?? {
      month,
      total: 0,
      cash_total: 0,
      upi_total: 0,
      count: 0,
    };
    const amount = Number(p.amount ?? 0);
    current.total += amount;
    if (p.payment_mode === "cash") current.cash_total += amount;
    if (p.payment_mode === "upi") current.upi_total += amount;
    current.count += 1;
    map.set(month, current);
  }

  const rows = Array.from(map.values()).sort((a, b) => (a.month < b.month ? 1 : -1));
  return NextResponse.json({ rows });
}

