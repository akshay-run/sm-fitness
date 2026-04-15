import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  IST_TZ,
  reportScopeBounds,
  type ReportScope,
} from "@/lib/dateUtils";
import { getGymDisplay } from "@/lib/gymDisplay";
import { ReportsPageClient, type SummaryJson } from "@/components/reports/ReportsPageClient";

type PaymentNestedRow = {
  id: string;
  amount: number | string | null;
  payment_mode: string;
  payment_date: string;
  membership_id: string;
  member_id: string;
  members: { full_name: string; mobile: string | null }[] | null;
  memberships: {
    plan_id: string;
    start_date: string;
    end_date: string;
    plans: { name: string }[] | null;
  }[] | null;
};

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

export default async function ReportsPage() {
  const scope: ReportScope = "this_month";
  const { startIST, endIST } = reportScopeBounds(scope);
  const supabaseAdmin = createSupabaseAdminClient();

  let payQuery = supabaseAdmin
    .from("payments")
    .select(
      `
      id,
      amount,
      payment_mode,
      payment_date,
      receipt_number,
      membership_id,
      member_id,
      members ( full_name, mobile ),
      memberships ( plan_id, start_date, end_date, plans ( name ) )
    `
    )
    .order("payment_date", { ascending: false });

  if (startIST && endIST) {
    payQuery = payQuery.gte("payment_date", startIST).lt("payment_date", endIST);
  }

  const { data: payments } = await payQuery;
  const payRows = (payments ?? []) as PaymentNestedRow[];
  let cashTotal = 0;
  let upiTotal = 0;
  const planRev = new Map<string, { name: string; revenue: number; payments: number; members: Set<string> }>();
  const paymentList: SummaryJson["payments"] = [];

  for (const p of payRows) {
    const member = p.members?.[0] ?? null;
    const membership = p.memberships?.[0] ?? null;
    const amt = Number(p.amount ?? 0);
    if (p.payment_mode === "cash") cashTotal += amt;
    if (p.payment_mode === "upi") upiTotal += amt;
    const planId = membership?.plan_id != null ? String(membership.plan_id) : null;
    const planNameResolved = planId ? (membership?.plans?.[0]?.name ?? "Plan") : "—";
    if (planId) {
      const cur = planRev.get(planId) ?? {
        name: planNameResolved,
        revenue: 0,
        payments: 0,
        members: new Set<string>(),
      };
      cur.revenue += amt;
      cur.payments += 1;
      cur.members.add(String(p.member_id));
      planRev.set(planId, cur);
    }
    paymentList.push({
      id: String(p.id),
      member_name: member?.full_name ?? "Member",
      member_mobile: member?.mobile ?? "—",
      payment_date: String(p.payment_date),
      plan_name: planNameResolved,
      amount: amt,
      mode: String(p.payment_mode),
    });
  }

  const planBreakdown: SummaryJson["plan_breakdown"] = Array.from(planRev.entries()).map(([id, v]) => ({
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
  const growth: SummaryJson["member_growth"] = [];
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

  const initialSummary: SummaryJson = {
    scope,
    period: { startIST, endIST },
    summary: {
      payment_count: payRows.length,
      cash_total: cashTotal,
      upi_total: upiTotal,
      grand_total: cashTotal + upiTotal,
      new_members: newMembersCount,
    },
    payments: paymentList,
    plan_breakdown: planBreakdown,
    member_growth: growth,
  };

  const gym = await getGymDisplay(supabaseAdmin);
  const gymName = gym.gym_name || "SM FITNESS";

  return <ReportsPageClient initialSummary={initialSummary} initialGymName={gymName} />;
}