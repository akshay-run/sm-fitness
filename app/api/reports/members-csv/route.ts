import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function getStatusByEndDate(endDate: string | null, today: string) {
  if (!endDate) return "no_membership";
  if (endDate < today) return "expired";
  if (endDate <= todayPlus7(today)) return "expiring_soon";
  return "active";
}

function todayPlus7(today: string) {
  const d = new Date(`${today}T00:00:00+05:30`);
  d.setDate(d.getDate() + 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayIST() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

export async function GET() {
  const { user } = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: members, error: memError } = await supabaseAdmin
    .from("members")
    .select("id, full_name, mobile, email, is_active")
    .order("created_at", { ascending: false });
  if (memError) return new Response(memError.message, { status: 500 });

  const rows: string[] = [];
  rows.push(["name", "mobile", "email", "plan", "expiry", "status"].join(","));

  const today = todayIST();
  for (const m of members ?? []) {
    const { data: latest } = await supabaseAdmin
      .from("memberships")
      .select("plan_id, end_date")
      .eq("member_id", m.id)
      .neq("status", "cancelled")
      .order("end_date", { ascending: false })
      .limit(1);

    const latestMembership = latest?.[0];
    let planName = "";
    if (latestMembership?.plan_id) {
      const { data: plan } = await supabaseAdmin
        .from("plans")
        .select("name")
        .eq("id", latestMembership.plan_id)
        .single();
      planName = plan?.name ?? "";
    }

    const expiry = latestMembership?.end_date ? String(latestMembership.end_date) : "";
    const status = m.is_active
      ? getStatusByEndDate(expiry || null, today)
      : "inactive";

    rows.push(
      [
        csvEscape(m.full_name),
        csvEscape(m.mobile),
        csvEscape(m.email ?? ""),
        csvEscape(planName),
        csvEscape(expiry),
        csvEscape(status),
      ].join(",")
    );
  }

  const csv = rows.join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="members-export.csv"`,
    },
  });
}

