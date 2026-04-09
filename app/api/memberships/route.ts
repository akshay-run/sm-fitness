import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createMembershipSchema } from "@/lib/validations/membership.schema";
import { addDaysIST, addMonthsIST, todayISTDateString } from "@/lib/dateUtils";

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const today = todayISTDateString();

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("id, is_active")
    .eq("id", parsed.data.member_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  }
  if (!member.is_active) {
    return NextResponse.json(
      { error: "Cannot create membership for an inactive member" },
      { status: 400 }
    );
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("plans")
    .select("id, duration_months")
    .eq("id", parsed.data.plan_id)
    .eq("is_active", true)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Find latest active membership by end_date (DATE) in IST terms.
  const { data: activeMemberships, error: activeError } = await supabaseAdmin
    .from("memberships")
    .select("id, end_date")
    .eq("member_id", parsed.data.member_id)
    .neq("status", "cancelled")
    .gte("end_date", today)
    .order("end_date", { ascending: false })
    .limit(1);

  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 500 });
  }

  const latestActiveEndDate = activeMemberships?.[0]?.end_date
    ? String(activeMemberships[0].end_date)
    : null;

  const start_date = latestActiveEndDate ? addDaysIST(latestActiveEndDate, 1) : today;
  const end_date = addMonthsIST(start_date, Number(plan.duration_months));

  const { data: created, error: createError } = await supabaseAdmin
    .from("memberships")
    .insert({
      member_id: parsed.data.member_id,
      plan_id: parsed.data.plan_id,
      fee_charged: parsed.data.fee_charged,
      start_date,
      end_date,
      status: "active",
      created_by: user.id,
    })
    .select("id, start_date, end_date")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: created.id,
      start_date: created.start_date,
      end_date: created.end_date,
      warning_active_until: latestActiveEndDate,
    },
    { status: 201 }
  );
}

