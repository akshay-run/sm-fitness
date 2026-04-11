import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabaseAdmin = createSupabaseAdminClient();

  // Fetch all core data
  const [
    { data: payments, error: paymentsError },
    { data: members, error: membersError },
    { data: memberships, error: membershipsError },
    { data: plans, error: plansError }
  ] = await Promise.all([
    supabaseAdmin.from("payments").select("*").order("payment_date", { ascending: false }),
    supabaseAdmin.from("members").select("id, full_name, joining_date"),
    supabaseAdmin.from("memberships").select("id, member_id, plan_id, start_date, end_date"),
    supabaseAdmin.from("plans").select("id, name")
  ]);

  if (paymentsError || membersError || membershipsError || plansError) {
    return NextResponse.json({ error: "Failed to load report data" }, { status: 500 });
  }

  // Map plans
  const planMap = new Map(plans?.map(p => [p.id, p]));
  const memberMap = new Map(members?.map(m => [m.id, m]));
  const membershipMap = new Map(memberships?.map(ms => [ms.id, ms]));

  // Enhance payments with member names and plan names
  const enhancedPayments = payments?.map(p => {
    const member = memberMap.get(p.member_id);
    const ms = membershipMap.get(p.membership_id);
    const plan = ms?.plan_id ? planMap.get(ms.plan_id) : null;
    return {
      payment_date: p.payment_date,
      amount: p.amount,
      payment_mode: p.payment_mode,
      receipt_number: p.receipt_number,
      member_name: member?.full_name ?? "Unknown",
      plan_name: plan?.name ?? "Unknown"
    };
  });

  return NextResponse.json({
    payments: enhancedPayments,
    members: members,
    plans: plans,
    memberships: memberships
  });
}
