import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { internalServerError } from "@/lib/apiError";
import { addDaysIST, todayISTDateString } from "@/lib/dateUtils";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function getStatusByEndDate(endDate: string | null, today: string, todayPlus7: string) {
  if (!endDate) return "no_membership";
  if (endDate < today) return "expired";
  if (endDate <= todayPlus7) return "expiring_soon";
  return "active";
}

type MembershipRow = { member_id: string; plan_id: string; end_date: string; status: string };

export async function GET() {
  const { user } = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // Batch-fetch all data in parallel (eliminates N+1)
  const [{ data: members, error: memError }, { data: membershipsRaw }, { data: plansRaw }] =
    await Promise.all([
      supabaseAdmin
        .from("members")
        .select("id, full_name, mobile, email, is_active")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("memberships")
        .select("member_id, plan_id, end_date, status")
        .neq("status", "cancelled")
        .order("end_date", { ascending: false }),
      supabaseAdmin.from("plans").select("id, name"),
    ]);

  if (memError) return internalServerError("Failed to generate members CSV");

  // Build lookup maps
  const planMap = new Map((plansRaw ?? []).map((p) => [String(p.id), String(p.name ?? "")]));

  const latestMembershipByMember = new Map<string, MembershipRow>();
  for (const ms of (membershipsRaw ?? []) as MembershipRow[]) {
    const mid = String(ms.member_id);
    if (!latestMembershipByMember.has(mid)) {
      latestMembershipByMember.set(mid, ms);
    }
  }

  const today = todayISTDateString();
  const plus7 = addDaysIST(today, 7);

  const rows: string[] = [];
  rows.push(["name", "mobile", "email", "plan", "expiry", "status"].join(","));

  for (const m of members ?? []) {
    const latestMembership = latestMembershipByMember.get(String(m.id));
    const planName = latestMembership?.plan_id
      ? planMap.get(String(latestMembership.plan_id)) ?? ""
      : "";
    const expiry = latestMembership?.end_date ? String(latestMembership.end_date) : "";
    const status = m.is_active
      ? getStatusByEndDate(expiry || null, today, plus7)
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

