import { cache } from "react";
import { startOfMonth, subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  IST_TZ,
  addDaysIST,
  monthBoundsIST,
  previousMonthBoundsIST,
  todayISTDateString,
} from "@/lib/dateUtils";

export type DashboardUpcomingRow = {
  membership_id: string;
  member_id: string;
  full_name: string;
  mobile: string;
  plan_name: string;
  end_date: string;
};

export type DashboardRecentPaymentRow = {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number | string | null;
  payment_mode: string;
  receipt_number: string;
  payment_date: string;
  member_name: string;
  member_mobile: string;
  plan_name: string;
  start_date: string;
  end_date: string;
};

type PaymentAmountRow = { amount: number | string | null };

type UpcomingMembershipRow = {
  id: string;
  end_date: string;
  members: { full_name: string; mobile: string; id: string } | null;
  plans: { name: string } | null;
};

type RecentPaymentDbRow = {
  id: string;
  amount: number | string | null;
  payment_mode: string;
  receipt_number: string;
  payment_date: string;
  member_id: string;
  membership_id: string;
  members: { full_name: string; mobile: string } | null;
  memberships: {
    start_date: string;
    end_date: string;
    plans: { name: string } | null;
  } | null;
};

/**
 * React cache() dedupes this loader when the same server render requests it more than once.
 * List/members/payments/reports remain client-fetched; cache() does not apply there.
 */
export const loadDashboardHome = cache(async () => {
  const supabaseAdmin = createSupabaseAdminClient();

  const today = todayISTDateString();
  const in7 = addDaysIST(today, 7);

  const [{ count: totalMembers }, { count: activeMembers }] = await Promise.all([
    supabaseAdmin.from("members").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const [{ count: expiredMemberships }, { count: expiringSoonMemberships }] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .lt("end_date", today)
      .neq("status", "cancelled"),
    supabaseAdmin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .gte("end_date", today)
      .lte("end_date", in7)
      .neq("status", "cancelled"),
  ]);

  const { startIST: thisMonthStart, endIST: thisMonthEnd } = monthBoundsIST();
  const { startIST: lastMonthStart, endIST: lastMonthEnd } = previousMonthBoundsIST();

  const [thisMonthPayments, lastMonthPayments] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select("amount, payment_date")
      .gte("payment_date", thisMonthStart)
      .lt("payment_date", thisMonthEnd),
    supabaseAdmin
      .from("payments")
      .select("amount, payment_date")
      .gte("payment_date", lastMonthStart)
      .lt("payment_date", lastMonthEnd),
  ]);

  const thisMonthRevenue =
    (thisMonthPayments.data as PaymentAmountRow[] | null)?.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    ) ?? 0;
  const lastMonthRevenue =
    (lastMonthPayments.data as PaymentAmountRow[] | null)?.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    ) ?? 0;

  const { data: upcomingData } = await supabaseAdmin
    .from("memberships")
    .select(
      `
      id,
      end_date,
      member_id,
      members ( id, full_name, mobile ),
      plans ( name )
    `
    )
    .gte("end_date", today)
    .lte("end_date", in7)
    .eq("status", "active")
    .order("end_date", { ascending: true })
    .limit(10);

  const upcomingRows: DashboardUpcomingRow[] = [];
  for (const m of (upcomingData ?? []) as UpcomingMembershipRow[]) {
    const member = m.members;
    if (!member) continue;
    upcomingRows.push({
      membership_id: m.id,
      member_id: member.id,
      full_name: member.full_name,
      mobile: member.mobile,
      plan_name: m.plans?.name ?? "Plan",
      end_date: String(m.end_date),
    });
  }

  const { data: recentData } = await supabaseAdmin
    .from("payments")
    .select(
      `
      id,
      amount,
      payment_mode,
      receipt_number,
      payment_date,
      member_id,
      membership_id,
      members ( full_name, mobile ),
      memberships ( start_date, end_date, plans ( name ) )
    `
    )
    .order("created_at", { ascending: false })
    .limit(10);

  const recentRows: DashboardRecentPaymentRow[] = [];
  for (const p of (recentData ?? []) as RecentPaymentDbRow[]) {
    const mem = p.members;
    const ms = p.memberships;
    recentRows.push({
      id: p.id,
      membership_id: p.membership_id,
      member_id: p.member_id,
      amount: p.amount,
      payment_mode: p.payment_mode,
      receipt_number: p.receipt_number,
      payment_date: p.payment_date,
      member_name: mem?.full_name ?? "Member",
      member_mobile: mem?.mobile ?? "",
      plan_name: ms?.plans?.name ?? "Membership",
      start_date: ms?.start_date != null ? String(ms.start_date) : "-",
      end_date: ms?.end_date != null ? String(ms.end_date) : "-",
    });
  }

  const trendUp = thisMonthRevenue >= lastMonthRevenue;

  const oldestMonthStart = monthBoundsIST(subMonths(startOfMonth(new Date()), 5)).startIST;
  const currentMonthEnd = monthBoundsIST().endIST;

  const { data: sixMonthPaymentsRaw } = await supabaseAdmin
    .from("payments")
    .select("amount, payment_date")
    .gte("payment_date", oldestMonthStart)
    .lt("payment_date", currentMonthEnd);

  const sixMonthPayments = (sixMonthPaymentsRaw ?? []) as PaymentAmountRow[];

  const revenueLast6: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = subMonths(startOfMonth(new Date()), i);
    const { startIST, endIST } = monthBoundsIST(ref);
    const total = sixMonthPayments.reduce((sum, p) => {
      const pd = String(p.payment_date ?? "");
      if (pd >= startIST && pd < endIST) {
        return sum + Number(p.amount ?? 0);
      }
      return sum;
    }, 0);
    revenueLast6.push({
      month: formatInTimeZone(ref, IST_TZ, "MMM yy"),
      total,
    });
  }

  const gymBrand = process.env.NEXT_PUBLIC_GYM_NAME ?? "SM FITNESS";

  return {
    today,
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    expiredMemberships: expiredMemberships ?? 0,
    expiringSoonMemberships: expiringSoonMemberships ?? 0,
    thisMonthRevenue,
    lastMonthRevenue,
    trendUp,
    upcomingRows,
    recentRows,
    revenueLast6,
    gymBrand,
  };
});
