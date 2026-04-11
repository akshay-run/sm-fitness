import { NextResponse, type NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendMail } from "@/lib/mailer";
import { logBackupEmail } from "@/lib/email";
import { IST_TZ, monthBoundsIST, todayISTDateString } from "@/lib/dateUtils";

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

function daysLeftFromEnd(todayIST: string, endDate: string): number {
  return Math.ceil(
    (new Date(`${endDate}T00:00:00+05:30`).getTime() -
      new Date(`${todayIST}T00:00:00+05:30`).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function tier(s: RowStatus): number {
  switch (s) {
    case "expired":
      return 0;
    case "expiring_soon":
      return 1;
    case "no_membership":
      return 2;
    case "active":
      return 3;
    default:
      return 4;
  }
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

  const backupEmail =
    (settingsRow?.backup_email && String(settingsRow.backup_email).trim()) ||
    (process.env.BACKUP_EMAIL && process.env.BACKUP_EMAIL.trim()) ||
    "";

  if (!backupEmail) {
    console.warn("[cron/backup] No backup_email in gym_settings and BACKUP_EMAIL env not set; skipping send.");
    return NextResponse.json({ ok: true, skipped: true, reason: "no_backup_recipient" });
  }

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

  const payByMember = new Map<string, PaymentRow[]>();
  for (const p of payments ?? []) {
    const id = String(p.member_id);
    const list = payByMember.get(id) ?? [];
    list.push(p as PaymentRow);
    payByMember.set(id, list);
  }

  const latestPayment = (memberId: string): PaymentRow | null => {
    const list = payByMember.get(memberId);
    if (!list?.length) return null;
    return [...list].sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )[0] ?? null;
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

  type TableRow = {
    name: string;
    mobile: string;
    plan: string;
    expiry: string;
    daysLeft: string;
    lastPaid: string;
    amount: string;
    mode: string;
    status: RowStatus;
    sortEnd: string;
    sortDays: number;
  };

  const rows: TableRow[] = [];
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
        daysLeftNum = daysLeftFromEnd(todayIST, end);
        expired += 1;
      } else {
        daysLeftNum = daysLeftFromEnd(todayIST, end);
        if (daysLeftNum <= 7) {
          status = "expiring_soon";
          expiringSoon += 1;
        } else {
          status = "active";
          active += 1;
        }
      }
    }

    const lp = latestPayment(mem.id);
    const lastPaid = lp ? formatInTimeZone(new Date(lp.payment_date), IST_TZ, "dd MMM yyyy") : "—";
    const amount = lp ? formatInr(Number(lp.amount ?? 0)) : "—";
    const mode = lp ? String(lp.payment_mode).toUpperCase() : "—";
    const daysLeftStr =
      !lm ? "—" : status === "expired" ? String(daysLeftNum) : String(daysLeftNum);

    rows.push({
      name: mem.full_name,
      mobile: mem.mobile ?? "—",
      plan,
      expiry: expiry === "—" ? "—" : formatInTimeZone(new Date(`${expiry}T00:00:00+05:30`), IST_TZ, "dd MMM yyyy"),
      daysLeft: daysLeftStr,
      lastPaid,
      amount,
      mode,
      status,
      sortEnd: lm ? String(lm.end_date) : "",
      sortDays: daysLeftNum,
    });
  }

  const total = (members ?? []).length;

  rows.sort((a, b) => {
    const ta = tier(a.status);
    const tb = tier(b.status);
    if (ta !== tb) return ta - tb;
    if (a.status === "expired") return a.sortEnd.localeCompare(b.sortEnd);
    if (a.status === "expiring_soon") return a.sortDays - b.sortDays;
    if (a.status === "no_membership") return a.name.localeCompare(b.name);
    if (a.status === "active") return b.sortEnd.localeCompare(a.sortEnd);
    return a.name.localeCompare(b.name);
  });

  const subjectDate = formatInTimeZone(new Date(), IST_TZ, "dd MMM yyyy");
  const subject = `SM FITNESS — Member Backup ${subjectDate} (${active} active members)`;

  const summaryBar = `
  <div style="background:#1e293b;color:#fff;padding:12px 16px;border-radius:8px;font-family:system-ui,sans-serif;font-size:14px;margin-bottom:16px;">
    <div><strong>Total:</strong> ${total} &nbsp;|&nbsp; <strong>Active:</strong> ${active} &nbsp;|&nbsp; <strong>Expiring this week:</strong> ${expiringSoon} &nbsp;|&nbsp; <strong>Expired:</strong> ${expired} &nbsp;|&nbsp; <strong>No plan:</strong> ${noMembership}</div>
    <div style="margin-top:8px;"><strong>This month revenue:</strong> ${formatInr(revenueThisMonth)} &nbsp;|&nbsp; <strong>Cash:</strong> ${formatInr(cashThisMonth)} &nbsp;|&nbsp; <strong>UPI:</strong> ${formatInr(upiThisMonth)}</div>
  </div>`;

  const rowBg: Record<RowStatus, string> = {
    expired: "#FEE2E2",
    expiring_soon: "#FEF9C3",
    no_membership: "#DBEAFE",
    active: "#FFFFFF",
  };

  let tableBody = "";
  for (const r of rows) {
    tableBody += `<tr style="background:${rowBg[r.status]};">
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.name)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.mobile)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.plan)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.expiry)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.daysLeft)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.lastPaid)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.amount)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(r.mode)}</td>
    </tr>`;
  }

  const generated = formatInTimeZone(new Date(), IST_TZ, "dd MMM yyyy, hh:mm a") + " IST";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
  <body style="font-family:system-ui,sans-serif;color:#0f172a;">
  ${summaryBar}
  <table style="border-collapse:collapse;width:100%;font-size:13px;">
    <thead>
      <tr style="background:#334155;color:#fff;">
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Name</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Mobile</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Plan</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Expiry</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Days Left</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Last Paid</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Amount</th>
        <th style="padding:8px;border:1px solid #334155;text-align:left;">Mode</th>
      </tr>
    </thead>
    <tbody>${tableBody}</tbody>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#64748b;">This is an automated backup from SM FITNESS Admin App.<br/>Generated: ${escapeHtml(generated)}</p>
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
      revenue_this_month: revenueThisMonth,
      cash_this_month: cashThisMonth,
      upi_this_month: upiThisMonth,
    },
  });
}
