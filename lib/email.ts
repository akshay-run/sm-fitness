import { sendMail } from "@/lib/mailer";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailType =
  | "welcome"
  | "receipt"
  | "reminder_7d"
  | "reminder_1d"
  | "expired"
  | "backup";

/** System-wide email log row (no single member). Requires `email_logs.member_id` nullable in DB. */
export async function logBackupEmail({
  supabaseAdmin,
  sent_to,
  status,
  error_msg,
}: {
  supabaseAdmin: SupabaseClient;
  sent_to: string;
  status: "sent" | "failed";
  error_msg?: string | null;
}) {
  await supabaseAdmin.from("email_logs").insert({
    member_id: null,
    type: "backup",
    sent_to,
    status,
    error_msg: error_msg ?? null,
    membership_id: null,
  });
}

export async function logEmail({
  supabaseAdmin,
  member_id,
  type,
  sent_to,
  status,
  error_msg,
  membership_id,
}: {
  supabaseAdmin: SupabaseClient;
  member_id: string;
  type: EmailType;
  sent_to: string;
  status: "sent" | "failed";
  error_msg?: string | null;
  membership_id?: string | null;
}) {
  await supabaseAdmin.from("email_logs").insert({
    member_id,
    type,
    sent_to,
    status,
    error_msg: error_msg ?? null,
    membership_id: membership_id ?? null,
  });
}

export async function hasSentEmail({
  supabaseAdmin,
  member_id,
  type,
  membership_id,
}: {
  supabaseAdmin: SupabaseClient;
  member_id: string;
  type: EmailType;
  membership_id?: string | null;
}) {
  let q = supabaseAdmin
    .from("email_logs")
    .select("id", { head: true, count: "exact" })
    .eq("member_id", member_id)
    .eq("type", type)
    .eq("status", "sent");

  if (membership_id) q = q.eq("membership_id", membership_id);
  const { count, error } = await q;
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function hasSentEmailOnDate({
  supabaseAdmin,
  member_id,
  type,
  membership_id,
  dateIST,
}: {
  supabaseAdmin: SupabaseClient;
  member_id: string;
  type: EmailType;
  membership_id?: string | null;
  dateIST: string; // yyyy-MM-dd
}) {
  const nextDateIST = (() => {
    const d = new Date(`${dateIST}T00:00:00+05:30`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  })();

  let q = supabaseAdmin
    .from("email_logs")
    .select("id", { head: true, count: "exact" })
    .eq("member_id", member_id)
    .eq("type", type)
    .eq("status", "sent")
    .gte("sent_at", `${dateIST}T00:00:00+05:30`)
    .lt("sent_at", `${nextDateIST}T00:00:00+05:30`);

  if (membership_id) q = q.eq("membership_id", membership_id);
  const { count, error } = await q;
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function sendAndLog({
  supabaseAdmin,
  member_id,
  type,
  to,
  subject,
  html,
  membership_id,
}: {
  supabaseAdmin: SupabaseClient;
  member_id: string;
  type: EmailType;
  to: string;
  subject: string;
  html: string;
  membership_id?: string | null;
}) {
  try {
    await sendMail({ to, subject, html });
    await logEmail({
      supabaseAdmin,
      member_id,
      type,
      sent_to: to,
      status: "sent",
      membership_id,
    });
    return { ok: true as const };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Email send failed";
    await logEmail({
      supabaseAdmin,
      member_id,
      type,
      sent_to: to,
      status: "failed",
      error_msg: msg,
      membership_id,
    });
    return { ok: false as const, error: msg };
  }
}

