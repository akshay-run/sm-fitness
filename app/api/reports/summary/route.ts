import { NextResponse } from "next/server";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { IST_TZ, reportScopeBounds, type ReportScope } from "@/lib/dateUtils";

const scopeSchema = z.enum([
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "all_time",
]);

function monthKeyIST(d: Date) {
  return formatInTimeZone(d, IST_TZ, "yyyy-MM");
}

function effectiveMemberDate(row: {
  joining_date: string | null;
  created_at: string;
}): string {
  if (row.joining_date) return String(row.joining_date).slice(0, 10);
  return formatInTimeZone(new Date(row.created_at), IST_TZ, "yyyy-MM-dd");
}

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(req.url);
  const scopeParsed = scopeSchema.safeParse(url.searchParams.get("scope") ?? "this_month");
  if (!scopeParsed.success) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  const scope = scopeParsed.data as ReportScope;
  const { startIST, endIST } = reportScopeBounds(scope);

  const supabaseAdmin = createSupabaseAdminClient();

  let payQuery = supabaseAdmin
    .from("payments")
    .select("id, amount, payment_mode, payment_date, membership_id, member_id")
    .order("payment_date", { ascending: false });

  if (startIST && endIST) {
    payQuery = payQuery.gte("payment_date", startIST).lt("payment_date", endIST);
  }

  const { data: payments, error: payErr } = await payQuery;
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

  const payRows = payments ?? [];
  const memberIds = [...new Set(payRows.map((p) => String(p.member_id)))];
  const membershipIds = [...new Set(payRows.map((p) => String(p.membership_id)))];

  const [{ data: members }, { data: memberships }] = await Promise.all([
    memberIds.length
      ? supabaseAdmin.from("members").select("id, full_name, mobile").in("id", memberIds)
      : { data: [] as { id: string; full_name: string; mobile: string }[] },
    membershipIds.length
      ? supabaseAdmin
          .from("memberships")
          .select("id, plan_id")
          .in("id", membershipIds)
      : { data: [] as { id: string; plan_id: string }[] },
  ]);

  const memberMap = new Map(
    (members ?? []).map((m) => [String(m.id), { name: m.full_name, mobile: m.mobile ?? "" }])
  );
  const memShipMap = new Map((memberships ?? []).map((m) => [String(m.id), String(m.plan_id)]));

  const planIds = [...new Set((memberships ?? []).map((m) => String(m.plan_id)))];
  const { data: plans } = planIds.length
    ? await supabaseAdmin.from("plans").select("id, name").in("id", planIds)
    : { data: [] as { id: string; name: string }[] };
  const planName = new Map((plans ?? []).map((p) => [String(p.id), p.name]));

  let cashTotal = 0;
  let upiTotal = 0;
  const planRev = new Map<
    string,
    { name: string; revenue: number; payments: number; members: Set<string> }
  >();
  const paymentList: Array<{
    id: string;
    member_name: string;
    member_mobile: string;
    payment_date: string;
    plan_name: string;
    amount: number;
    mode: string;
  }> = [];

  for (const p of payRows) {
    const amt = Number(p.amount ?? 0);
    if (p.payment_mode === "cash") cashTotal += amt;
    if (p.payment_mode === "upi") upiTotal += amt;

    const pid = memShipMap.get(String(p.membership_id));
    const pname = pid ? planName.get(pid) ?? "Plan" : "—";
    if (pid) {
      const cur = planRev.get(pid) ?? {
        name: pname,
        revenue: 0,
        payments: 0,
        members: new Set<string>(),
      };
      cur.revenue += amt;
      cur.payments += 1;
      cur.members.add(String(p.member_id));
      planRev.set(pid, cur);
    }

    const mem = memberMap.get(String(p.member_id));
    paymentList.push({
      id: String(p.id),
      member_name: mem?.name ?? "Member",
      member_mobile: mem?.mobile ?? "—",
      payment_date: String(p.payment_date),
      plan_name: pname,
      amount: amt,
      mode: String(p.payment_mode),
    });
  }

  const planBreakdown = Array.from(planRev.entries()).map(([id, v]) => ({
    plan_id: id,
    plan_name: v.name,
    revenue: v.revenue,
    payment_count: v.payments,
    member_count: v.members.size,
  }));

  const { data: allMembersForGrowth } = await supabaseAdmin
    .from("members")
    .select("id, joining_date, created_at");

  const now = new Date();
  const growth: { month: string; total_members: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = addMonths(startOfMonth(now), -i);
    const end = endOfMonth(ref);
    const mk = monthKeyIST(ref);
    const endStr = formatInTimeZone(end, IST_TZ, "yyyy-MM-dd");
    let total = 0;
    for (const m of allMembersForGrowth ?? []) {
      const eff = effectiveMemberDate(m);
      if (eff <= endStr) total += 1;
    }
    growth.push({ month: mk, total_members: total });
  }

  let newMembersCount = 0;
  if (startIST && endIST) {
    const startDate = startIST.slice(0, 10);
    const endDate = endIST.slice(0, 10);
    for (const m of allMembersForGrowth ?? []) {
      const jd = m.joining_date ? String(m.joining_date).slice(0, 10) : null;
      if (jd && jd >= startDate && jd < endDate) {
        newMembersCount += 1;
        continue;
      }
      if (!jd) {
        const ca = formatInTimeZone(new Date(m.created_at), IST_TZ, "yyyy-MM-dd");
        if (ca >= startDate && ca < endDate) newMembersCount += 1;
      }
    }
  } else if (!startIST && !endIST) {
    newMembersCount = (allMembersForGrowth ?? []).length;
  }

  const grandTotal = cashTotal + upiTotal;

  return NextResponse.json({
    scope,
    period: { startIST, endIST },
    summary: {
      payment_count: payRows.length,
      cash_total: cashTotal,
      upi_total: upiTotal,
      grand_total: grandTotal,
      new_members: newMembersCount,
    },
    payments: paymentList,
    plan_breakdown: planBreakdown,
    member_growth: growth,
  });
}
