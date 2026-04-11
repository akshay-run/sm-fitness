import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { addDaysIST, monthBoundsIST, previousMonthBoundsIST, todayISTDateString } from "@/lib/dateUtils";

type PaymentAmountRow = { amount: number | string | null };
type RecentPaymentRow = {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number | string | null;
  payment_mode: string;
  receipt_number: string;
  payment_date: string;
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
        .select("amount")
        .gte("payment_date", thisMonthStart)
        .lt("payment_date", thisMonthEnd),
      supabaseAdmin
        .from("payments")
        .select("amount")
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

    const { data: upcoming } = await supabaseAdmin
      .from("memberships")
      .select("id, member_id, plan_id, end_date")
      .gte("end_date", today)
      .lte("end_date", in7)
      .neq("status", "cancelled")
      .order("end_date", { ascending: true })
      .limit(10);

    const upcomingRows = [];
    for (const m of upcoming ?? []) {
      const [{ data: member }, { data: plan }] = await Promise.all([
        supabaseAdmin
          .from("members")
          .select("id, full_name, mobile")
          .eq("id", m.member_id)
          .single(),
        supabaseAdmin.from("plans").select("name").eq("id", m.plan_id).single(),
      ]);
      if (!member) continue;
      upcomingRows.push({
        membership_id: m.id,
        member_id: member.id,
        full_name: member.full_name,
        mobile: member.mobile,
        plan_name: plan?.name ?? "Plan",
        end_date: String(m.end_date),
      });
    }

    const { data: recentPayments } = await supabaseAdmin
      .from("payments")
      .select("id, amount, payment_mode, receipt_number, payment_date, member_id")
      .order("payment_date", { ascending: false })
      .limit(10);

    const recentRows = [];
    for (const p of (recentPayments as RecentPaymentRow[] | null) ?? []) {
      const [{ data: member }, { data: membership }] = await Promise.all([
        supabaseAdmin.from("members").select("full_name, mobile").eq("id", p.member_id).single(),
        supabaseAdmin
          .from("memberships")
          .select("plan_id, start_date, end_date")
          .eq("id", p.membership_id)
          .single(),
      ]);
      let planName = "Membership";
      if (membership?.plan_id) {
        const { data: plan } = await supabaseAdmin.from("plans").select("name").eq("id", membership.plan_id).single();
        if (plan) planName = plan.name;
      }
      recentRows.push({
        ...p,
        member_name: member?.full_name ?? "Member",
        member_mobile: member?.mobile ?? "",
        plan_name: planName,
        start_date: String(membership?.start_date ?? "-"),
        end_date: String(membership?.end_date ?? "-"),
      });
    }

    return NextResponse.json({
      today,
      totalMembers,
      activeMembers,
      expiredMemberships,
      expiringSoonMemberships,
      thisMonthRevenue,
      lastMonthRevenue,
      upcomingRows,
      recentRows,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load dashboard";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
