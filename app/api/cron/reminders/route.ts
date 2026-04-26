import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyCronSecret } from "@/lib/cron";
import { addDaysIST, todayISTDateString } from "@/lib/dateUtils";
import { hasSentEmailOnDate, sendAndLog } from "@/lib/email";
import { skipMemberEmailIfNoAddress } from "@/lib/memberEmail";
import { renderReminderEmail } from "@/components/email/ReminderEmail";
import { formatDateShortIST } from "@/lib/uiFormat";

type JobStat = { attempted: number; sent: number; skipped: number; failed: number };

async function handleType({
  type,
  targetEndDate,
  todayIST,
}: {
  type: "reminder_7d" | "reminder_1d" | "expired";
  targetEndDate: string; // yyyy-MM-dd
  todayIST: string; // yyyy-MM-dd
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";

  const { data: memberships, error } = await supabaseAdmin
    .from("memberships")
    .select("id, member_id, plan_id, end_date")
    .neq("status", "cancelled")
    .eq("end_date", targetEndDate);

  if (error) throw new Error(error.message);
  if (!memberships?.length) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  // --- Batch fetch members, plans, and newer memberships (eliminates N+1) ---
  const memberIds = [...new Set(memberships.map((m) => String(m.member_id)))];
  const planIds = [...new Set(memberships.map((m) => String(m.plan_id)))];

  const [{ data: membersRaw }, { data: plansRaw }] = await Promise.all([
    supabaseAdmin
      .from("members")
      .select("id, full_name, email, is_active")
      .in("id", memberIds),
    supabaseAdmin.from("plans").select("id, name").in("id", planIds),
  ]);

  const memberMap = new Map(
    (membersRaw ?? []).map((m) => [String(m.id), m])
  );
  const planMap = new Map(
    (plansRaw ?? []).map((p) => [String(p.id), p.name as string])
  );

  // For expired/reminder_1d, batch check for newer memberships
  let membersWithNewerMembership: Set<string> | null = null;
  if (type === "expired" || type === "reminder_1d") {
    const { data: newerRows } = await supabaseAdmin
      .from("memberships")
      .select("member_id")
      .in("member_id", memberIds)
      .gte("start_date", todayIST);
    membersWithNewerMembership = new Set(
      (newerRows ?? []).map((r) => String(r.member_id))
    );
  }

  const stats: JobStat = { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  for (const m of memberships) {
    stats.attempted += 1;

    const member = memberMap.get(String(m.member_id));
    if (!member) {
      stats.skipped += 1;
      continue;
    }

    if (member.is_active === false) {
      stats.skipped += 1;
      continue;
    }

    const emailGuard = skipMemberEmailIfNoAddress({
      full_name: member.full_name,
      email: member.email,
    });
    if (emailGuard.skipped) {
      stats.skipped += 1;
      continue;
    }

    const already = await hasSentEmailOnDate({
      supabaseAdmin,
      member_id: member.id,
      type,
      membership_id: m.id,
      dateIST: todayIST,
    });
    if (already) {
      stats.skipped += 1;
      continue;
    }

    if (membersWithNewerMembership?.has(String(member.id))) {
      stats.skipped += 1;
      continue;
    }

    const planName = planMap.get(String(m.plan_id)) ?? "Membership";

    const html = renderReminderEmail({
      gymName,
      memberName: member.full_name,
      type,
      planName,
      endDate: formatDateShortIST(String(m.end_date)),
    });

    const firstName = String(member.full_name || "").trim().split(/\s+/)[0] || member.full_name;
    const subject =
      type === "expired"
        ? `Your membership has expired — come back to ${gymName}!`
        : type === "reminder_1d"
          ? `🚨 Last day! ${firstName}, your membership expires tomorrow — ${gymName}`
          : `⏰ ${firstName}, your membership expires in 7 days — ${gymName}`;

    const sent = await sendAndLog({
      supabaseAdmin,
      member_id: member.id,
      type,
      to: emailGuard.to,
      subject,
      html,
      membership_id: m.id,
    });

    if (sent.ok) stats.sent += 1;
    else stats.failed += 1;
  }

  // For "expired", optionally update membership.status for trigger bookkeeping
  if (type === "expired") {
    await supabaseAdmin
      .from("memberships")
      .update({ status: "expired" })
      .neq("status", "cancelled")
      .eq("end_date", targetEndDate);
  }

  return stats;
}

export async function GET(req: NextRequest) {
  const authFail = verifyCronSecret(req);
  if (authFail) return authFail;

  const todayIST = todayISTDateString();
  const date7 = addDaysIST(todayIST, 7);
  const date1 = addDaysIST(todayIST, 1);

  try {
    const s7 = await handleType({ type: "reminder_7d", targetEndDate: date7, todayIST });
    const s1 = await handleType({ type: "reminder_1d", targetEndDate: date1, todayIST });
    const se = await handleType({ type: "expired", targetEndDate: todayIST, todayIST });

    return NextResponse.json({
      ok: true,
      todayIST,
      reminder_7d_end_date: date7,
      reminder_1d_end_date: date1,
      stats: {
        reminder_7d: s7,
        reminder_1d: s1,
        expired: se,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

