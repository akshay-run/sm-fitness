import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyCronSecret } from "@/lib/cron";
import { addDaysIST, todayISTDateString } from "@/lib/dateUtils";
import { hasSentEmailOnDate, sendAndLog } from "@/lib/email";
import { renderReminderEmail } from "@/components/email/ReminderEmail";

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

  const stats: JobStat = { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  for (const m of memberships ?? []) {
    stats.attempted += 1;

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, is_active")
      .eq("id", m.member_id)
      .single();

    if (!member?.email || member.is_active === false) {
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

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("name")
      .eq("id", m.plan_id)
      .single();

    const html = renderReminderEmail({
      gymName,
      memberName: member.full_name,
      type,
      planName: plan?.name ?? "Membership",
      endDate: String(m.end_date),
    });

    const subject =
      type === "expired"
        ? `Membership expired — ${gymName}`
        : type === "reminder_1d"
          ? `Membership expires tomorrow — ${gymName}`
          : `Membership expires soon — ${gymName}`;

    const sent = await sendAndLog({
      supabaseAdmin,
      member_id: member.id,
      type,
      to: member.email,
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

