import { NextResponse, type NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendMail } from "@/lib/mailer";
import { logBackupEmail } from "@/lib/email";
import { skipBackupEmailIfNoRecipient } from "@/lib/memberEmail";
import { IST_TZ, getDaysRemaining, monthBoundsIST, todayISTDateString, addDaysIST } from "@/lib/dateUtils";

type MemberRow = {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  member_code: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  fee_charged: number | null;
  status: string;
};

type PaymentRow = {
  member_id: string;
  amount: number | null;
  payment_date: string;
  payment_mode: string;
};

type RowStatus = "active" | "expiring_soon" | "expired" | "no_membership";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInr(n: number): string {
  const s = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
  return `₹${s}`;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const todayIST = todayISTDateString();
  const { startIST, endIST } = monthBoundsIST();

  // "Last 5 days" logic
  const cutoff5DaysStr = addDaysIST(todayIST, -5);
  const cutoff5DaysMs = new Date(`${cutoff5DaysStr}T00:00:00+05:30`).getTime();

  const [
    { data: members, error: memErr },
    { data: memberships, error: msErr },
    { data: payments, error: payErr },
    { data: plans, error: planErr },
    { data: settingsRow },
  ] = await Promise.all([
    supabaseAdmin
      .from("members")
      .select("id, full_name, mobile, email, member_code, created_at"),
    supabaseAdmin
      .from("memberships")
      .select("id, member_id, plan_id, start_date, end_date, fee_charged, status"),
    supabaseAdmin.from("payments").select("member_id, amount, payment_date, payment_mode"),
    supabaseAdmin.from("plans").select("id, name"),
    supabaseAdmin.from("gym_settings").select("backup_email").eq("id", 1).maybeSingle(),
  ]);

  if (memErr || msErr || payErr || planErr) {
    const msg = memErr?.message || msErr?.message || payErr?.message || planErr?.message || "Query failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const backupEmailRaw =
    (settingsRow?.backup_email && String(settingsRow.backup_email)) ||
    (process.env.BACKUP_EMAIL && String(process.env.BACKUP_EMAIL)) ||
    "";

  const backupSkip = skipBackupEmailIfNoRecipient(backupEmailRaw);
  if (backupSkip.skipped) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_backup_recipient" });
  }
  const backupEmail = backupSkip.to;

  const planName = new Map((plans ?? []).map((p) => [String(p.id), String(p.name ?? "Plan")]));

  const msByMember = new Map<string, MembershipRow[]>();
  for (const m of memberships ?? []) {
    if (String(m.status).toLowerCase() === "cancelled") continue;
    const id = String(m.member_id);
    const list = msByMember.get(id) ?? [];
    list.push(m as MembershipRow);
    msByMember.set(id, list);
  }

  const latestMembership = (memberId: string): MembershipRow | null => {
    const list = msByMember.get(memberId);
    if (!list?.length) return null;
    return [...list].sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] ?? null;
  };

  const monthStartMs = new Date(startIST).getTime();
  const monthEndMs = new Date(endIST).getTime();
  let revenueThisMonth = 0;
  let cashThisMonth = 0;
  let upiThisMonth = 0;

  for (const p of payments ?? []) {
    const t = new Date(p.payment_date).getTime();
    if (t >= monthStartMs && t < monthEndMs) {
      const amt = Number(p.amount ?? 0);
      revenueThisMonth += amt;
      if (p.payment_mode === "cash") cashThisMonth += amt;
      if (p.payment_mode === "upi") upiThisMonth += amt;
    }
  }

  type ActivityRow = {
    memberId: string;
    name: string;
    mobile: string;
    plan: string;
    joinedStr: string | null;
    paidStr: string | null;
    joinedTs: number | null;
    paidTs: number | null;
    amount: number;
    modes: Set<string>;
  };
  const activityByMem = new Map<string, ActivityRow>();

  const getActivity = (memId: string, name: string, mobile: string, plan: string) => {
    let a = activityByMem.get(memId);
    if (!a) {
      a = { memberId: memId, name, mobile, plan, joinedStr: null, paidStr: null, joinedTs: null, paidTs: null, amount: 0, modes: new Set() };
      activityByMem.set(memId, a);
    }
    return a;
  };

  let newMembersCount = 0;

  // Process Members for Last 5 Days
  for (const mem of (members ?? []) as MemberRow[]) {
    const joinedMs = new Date(mem.created_at).getTime();
    if (joinedMs >= cutoff5DaysMs) {
      newMembersCount++;
      const lm = latestMembership(mem.id);
      const plan = lm ? (planName.get(String(lm.plan_id)) ?? "Plan") : "—";
      const act = getActivity(mem.id, mem.full_name, mem.mobile || "—", plan);
      act.joinedStr = formatInTimeZone(new Date(mem.created_at), IST_TZ, "dd MMM");
      act.joinedTs = joinedMs;
    }
  }

  // Process Payments for Last 5 Days
  for (const p of payments ?? []) {
    const payMs = new Date(p.payment_date).getTime();
    if (payMs >= cutoff5DaysMs) {
      const mem = (members ?? []).find((m) => m.id === p.member_id);
      if (!mem) continue;
      const lm = latestMembership(mem.id);
      const plan = lm ? (planName.get(String(lm.plan_id)) ?? "Plan") : "—";
      
      const act = getActivity(mem.id, mem.full_name, mem.mobile || "—", plan);
      act.paidStr = formatInTimeZone(new Date(p.payment_date), IST_TZ, "dd MMM");
      act.paidTs = Math.max(act.paidTs || 0, payMs);
      act.amount += Number(p.amount || 0);
      if (p.payment_mode) act.modes.add(String(p.payment_mode).toUpperCase());
    }
  }

  type Last5DaysRow = {
    name: string;
    mobile: string;
    plan: string;
    joinedOrPaid: string;
    amount: string;
    mode: string;
    sortTs: number;
  };
  const last5DaysRows: Last5DaysRow[] = [];

  for (const act of activityByMem.values()) {
    let joinedOrPaid = "";
    if (act.joinedStr && act.paidStr) {
      if (act.joinedStr === act.paidStr) {
        joinedOrPaid = `Joined & Paid on ${act.joinedStr}`;
      } else {
        joinedOrPaid = `Joined ${act.joinedStr}, Paid ${act.paidStr}`;
      }
    } else if (act.joinedStr) {
      joinedOrPaid = `Joined on ${act.joinedStr}`;
    } else if (act.paidStr) {
      joinedOrPaid = `Paid on ${act.paidStr}`;
    }

    last5DaysRows.push({
      name: act.name,
      mobile: act.mobile,
      plan: act.plan,
      joinedOrPaid,
      amount: act.amount > 0 ? formatInr(act.amount) : "—",
      mode: act.modes.size > 0 ? Array.from(act.modes).join(", ") : "—",
      sortTs: Math.max(act.joinedTs || 0, act.paidTs || 0),
    });
  }

  // Sort Last 5 Days by Time Descending
  last5DaysRows.sort((a, b) => b.sortTs - a.sortTs);

  type MemberTableRow = {
    name: string;
    mobile: string;
    plan: string;
    expiryDateStr: string;
    expiry: string;
    daysLeft: string;
    status: RowStatus;
    sortEnd: string;
  };

  const allMembersRows: MemberTableRow[] = [];
  let active = 0;
  let expiringSoon = 0;
  let expired = 0;
  let noMembership = 0;

  for (const mem of (members ?? []) as MemberRow[]) {
    const lm = latestMembership(mem.id);
    let status: RowStatus;
    let daysLeftNum = 0;
    let expiry = "—";
    let plan = "—";

    if (!lm) {
      status = "no_membership";
      noMembership += 1;
    } else {
      plan = planName.get(String(lm.plan_id)) ?? "Plan";
      expiry = lm.end_date;
      const end = String(lm.end_date);
      if (end < todayIST) {
        status = "expired";
        daysLeftNum = getDaysRemaining(end);
        expired += 1;
      } else {
        daysLeftNum = getDaysRemaining(end);
        if (daysLeftNum <= 7) {
          status = "expiring_soon";
          expiringSoon += 1;
        } else {
          status = "active";
          active += 1;
        }
      }
    }

    const daysLeftStr = !lm ? "—" : String(daysLeftNum);

    allMembersRows.push({
      name: mem.full_name,
      mobile: mem.mobile ?? "—",
      plan,
      expiryDateStr: expiry,
      expiry: expiry === "—" ? "—" : formatInTimeZone(new Date(`${expiry}T00:00:00+05:30`), IST_TZ, "dd MMM"),
      daysLeft: daysLeftStr,
      status,
      sortEnd: lm ? String(lm.end_date) : "",
    });
  }

  const total = (members ?? []).length;

  const sortByArchive = (a: MemberTableRow, b: MemberTableRow) => {
    // expired -> expiring_soon -> no_membership -> active
    const t = (s: RowStatus) => (s === "expired" ? 0 : s === "expiring_soon" ? 1 : s === "no_membership" ? 2 : 3);
    const ta = t(a.status);
    const tb = t(b.status);
    if (ta !== tb) return ta - tb;
    if (a.sortEnd !== b.sortEnd) return a.sortEnd.localeCompare(b.sortEnd);
    return a.name.localeCompare(b.name);
  };

  allMembersRows.sort(sortByArchive);

  const needsAttentionRows = allMembersRows.filter(
    (r) => r.status === "expired" || r.status === "expiring_soon" || r.status === "no_membership"
  );
  // They are already sorted because allMembersRows is sorted

  const subjectDate = formatInTimeZone(new Date(), IST_TZ, "dd MMM yyyy");
  const subject = `SM FITNESS — Backup ${subjectDate} | ${active} active | ⚡ ${newMembersCount} new this week`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
  <body style="font-family:system-ui,sans-serif;color:#0f172a;background:#f8fafc;padding:16px;">
    <div style="max-width:800px;margin:auto;background:#ffffff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      
      <!-- SUMMARY -->
      <div style="background:#1e293b;color:#fff;padding:20px;border-radius:12px;margin-bottom:32px;">
        <h2 style="margin:0 0 16px 0;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">SUMMARY</h2>
        <div style="margin-bottom:16px;font-size:15px;">
          <strong>Total:</strong> ${total} &nbsp;|&nbsp; 
          <strong>Active:</strong> <span style="color:#4ade80;">${active}</span> &nbsp;|&nbsp; 
          <strong>Expiring soon:</strong> <span style="color:#fbbf24;">${expiringSoon}</span> &nbsp;|&nbsp; 
          <strong>Expired:</strong> <span style="color:#f87171;">${expired}</span> &nbsp;|&nbsp; 
          <strong>No plan:</strong> <span style="color:#94a3b8;">${noMembership}</span>
        </div>
        <div style="font-size:15px;border-top:1px solid #334155;padding-top:16px;">
          <strong>This month revenue:</strong> ${formatInr(revenueThisMonth)} &nbsp;|&nbsp; 
          <strong>Cash:</strong> <span style="color:#38bdf8;">${formatInr(cashThisMonth)}</span> &nbsp;|&nbsp; 
          <strong>UPI:</strong> <span style="color:#c084fc;">${formatInr(upiThisMonth)}</span>
        </div>
      </div>
      
      <!-- LAST 5 DAYS -->
      <div style="margin-bottom:32px;">
        <h3 style="margin:0 0 4px 0;font-size:16px;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">⚡ LAST 5 DAYS (Activity)</h3>
        <p style="margin:0 0 12px 0;font-size:13px;color:#64748b;">New members joined + payments received since last backup.</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr style="background:#fef3c7;color:#92400e;border-bottom:2px solid #fbbf24;">
              <th style="padding:10px 8px;text-align:left;">Name</th>
              <th style="padding:10px 8px;text-align:left;">Mobile</th>
              <th style="padding:10px 8px;text-align:left;">Plan</th>
              <th style="padding:10px 8px;text-align:left;">Joined/Paid</th>
              <th style="padding:10px 8px;text-align:left;">Amount</th>
              <th style="padding:10px 8px;text-align:left;">Mode</th>
            </tr>
          </thead>
          <tbody>
            ${
              last5DaysRows.length > 0
                ? last5DaysRows
                    .map(
                      (r) => `<tr style="background:#fffbeb;border-bottom:1px solid #fef3c7;">
               <td style="padding:10px 8px;color:#92400e;font-weight:600;">${escapeHtml(r.name)}</td>
               <td style="padding:10px 8px;">${escapeHtml(r.mobile)}</td>
               <td style="padding:10px 8px;">${escapeHtml(r.plan)}</td>
               <td style="padding:10px 8px;">${escapeHtml(r.joinedOrPaid)}</td>
               <td style="padding:10px 8px;font-weight:500;">${escapeHtml(r.amount)}</td>
               <td style="padding:10px 8px;">${escapeHtml(r.mode)}</td>
               </tr>`
                    )
                    .join("")
                : `<tr><td colspan="6" style="padding:16px 8px;text-align:center;background:#fffbeb;color:#92400e;">No recent activity in the last 5 days.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- NEEDS ATTENTION -->
      ${
        needsAttentionRows.length > 0
          ? `
      <div style="margin-bottom:32px;">
        <h3 style="margin:0 0 4px 0;font-size:16px;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">⚠️ NEEDS ATTENTION</h3>
        <p style="margin:0 0 12px 0;font-size:13px;color:#64748b;">Members expired, expiring within 7 days, or with no plan.</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr style="background:#f1f5f9;color:#334155;border-bottom:2px solid #cbd5e1;">
              <th style="padding:10px 8px;text-align:left;">Name</th>
              <th style="padding:10px 8px;text-align:left;">Mobile</th>
              <th style="padding:10px 8px;text-align:left;">Plan</th>
              <th style="padding:10px 8px;text-align:left;">Expiry</th>
              <th style="padding:10px 8px;text-align:left;">Days Left</th>
            </tr>
          </thead>
          <tbody>
            ${needsAttentionRows
              .map((r) => {
                const bg = r.status === "expired" ? "#fee2e2" : r.status === "expiring_soon" ? "#fef3c7" : "#dbeafe";
                const border =
                  r.status === "expired" ? "#fecaca" : r.status === "expiring_soon" ? "#fde68a" : "#bfdbfe";
                const fg = r.status === "expired" ? "#991b1b" : r.status === "expiring_soon" ? "#92400e" : "#1e40af";
                return `<tr style="background:${bg};border-bottom:1px solid ${border};color:${fg};">
               <td style="padding:10px 8px;font-weight:500;">${escapeHtml(r.name)}</td>
               <td style="padding:10px 8px;">${escapeHtml(r.mobile)}</td>
               <td style="padding:10px 8px;">${escapeHtml(r.plan)}</td>
               <td style="padding:10px 8px;font-weight:600;">${escapeHtml(r.expiry)}</td>
               <td style="padding:10px 8px;font-weight:600;">${escapeHtml(r.daysLeft)}</td>
               </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      <!-- ALL MEMBERS (ARCHIVE) -->
      <div style="margin-bottom:16px;">
        <h3 style="margin:0 0 4px 0;font-size:14px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">📋 ALL MEMBERS (Archive)</h3>
        <p style="margin:0 0 8px 0;font-size:11px;color:#94a3b8;">Sorted: expired → expiring → no plan → active.</p>
        <table style="border-collapse:collapse;width:100%;font-size:11px;color:#64748b;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569;">
              <th style="padding:6px 8px;text-align:left;font-weight:600;">Name</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;">Mobile</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;">Plan</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;">Expiry</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;">Days Left</th>
            </tr>
          </thead>
          <tbody>
            ${allMembersRows
              .map((r) => {
                return `<tr style="border-bottom:1px solid #f1f5f9;${r.status === "active" ? "" : "color:#475569;background:#f8fafc;"}">
               <td style="padding:6px 8px;">${escapeHtml(r.name)}</td>
               <td style="padding:6px 8px;">${escapeHtml(r.mobile)}</td>
               <td style="padding:6px 8px;">${escapeHtml(r.plan)}</td>
               <td style="padding:6px 8px;">${escapeHtml(r.expiry)}</td>
               <td style="padding:6px 8px;">${escapeHtml(r.daysLeft)}</td>
               </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      
      <p style="margin-top:32px;font-size:11px;color:#94a3b8;text-align:center;">
        This is an automated backup from SM FITNESS Admin App.<br/>
        Generated: ${escapeHtml(formatInTimeZone(new Date(), IST_TZ, "dd MMM yyyy, hh:mm a") + " IST")}
      </p>
    </div>
  </body></html>`;

  try {
    await sendMail({ to: backupEmail, subject, html });
    await logBackupEmail({ supabaseAdmin, sent_to: backupEmail, status: "sent" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Email send failed";
    console.error("[cron/backup]", msg);
    await logBackupEmail({
      supabaseAdmin,
      sent_to: backupEmail,
      status: "failed",
      error_msg: msg,
    });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total,
      active,
      expiring_soon: expiringSoon,
      expired,
      no_membership: noMembership,
    },
    counts: {
      active_members_last_5_days: activityByMem.size,
      new_members_last_5_days: newMembersCount,
    }
  });
}
