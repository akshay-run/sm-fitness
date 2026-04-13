import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createMemberSchema } from "@/lib/validations/member.schema";
import { getNextMemberCode } from "@/lib/memberCode";
import { hasSentEmail, sendAndLog } from "@/lib/email";
import { skipMemberEmailIfNoAddress } from "@/lib/memberEmail";
import { renderWelcomeEmail } from "@/components/email/WelcomeEmail";
import { internalServerError } from "@/lib/apiError";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
  tab: z.enum(["all", "active_membership", "expired", "deactivated"]).optional(),
  is_active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  expiring_within_days: z.coerce.number().int().min(1).max(90).optional(),
});

type MemberRow = {
  id: string;
  member_code: string;
  full_name: string;
  mobile: string;
  email: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  welcome_wa_sent: boolean | null;
};

type MembershipEmbed = {
  end_date: string;
  plan_id: string;
  status: string;
  plans: { name: string }[] | null;
};

type MemberWithMemberships = MemberRow & {
  memberships: MembershipEmbed[] | null;
};

function pickLatestNonCancelledMembership(
  rows: MembershipEmbed[] | null | undefined
): MembershipEmbed | null {
  if (!rows?.length) return null;
  const eligible = rows.filter((r) => r.status !== "cancelled");
  if (!eligible.length) return null;
  return eligible.reduce((a, b) => (String(a.end_date) >= String(b.end_date) ? a : b));
}

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    tab: url.searchParams.get("tab") ?? undefined,
    is_active: url.searchParams.get("is_active") ?? undefined,
    expiring_within_days: url.searchParams.get("expiring_within_days") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  let { tab } = parsed.data;
  const { q, page, pageSize, is_active: legacyIsActive, expiring_within_days } = parsed.data;
  if (!tab) {
    if (legacyIsActive === false) tab = "deactivated";
    else tab = "all";
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabaseAdmin = createSupabaseAdminClient();

  const today = new Date();
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);

  const memberSelect = `
    id,
    member_code,
    full_name,
    mobile,
    email,
    photo_url,
    is_active,
    created_at,
    welcome_wa_sent,
    memberships ( end_date, plan_id, status, plans ( name ) )
  `;

  const { data: allMembershipRows, error: msErr } = await supabaseAdmin
    .from("memberships")
    .select("member_id, plan_id, end_date, status")
    .neq("status", "cancelled")
    .order("end_date", { ascending: false });

  if (msErr) return internalServerError("Failed to load memberships");

  const latestEndByMember = new Map<string, { plan_id: string; end_date: string }>();
  for (const m of allMembershipRows ?? []) {
    const mid = String(m.member_id);
    if (!latestEndByMember.has(mid)) {
      latestEndByMember.set(mid, {
        plan_id: String(m.plan_id),
        end_date: String(m.end_date),
      });
    }
  }

  const hasCurrentMembershipIds = new Set<string>();
  for (const [mid, v] of latestEndByMember) {
    if (v.end_date >= todayIST) hasCurrentMembershipIds.add(mid);
  }
  const hasCurrentList = [...hasCurrentMembershipIds];

  const { count: allActiveCount } = await supabaseAdmin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: deactivatedCount } = await supabaseAdmin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("is_active", false);

  let activeMembershipTabCount = 0;
  if (hasCurrentList.length > 0) {
    const { count } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .in("id", hasCurrentList);
    activeMembershipTabCount = count ?? 0;
  }

  const activeCount = allActiveCount ?? 0;
  const inCurrent = activeMembershipTabCount;
  const tabCounts = {
    all: activeCount,
    active_membership: inCurrent,
    expired: Math.max(0, activeCount - inCurrent),
    deactivated: deactivatedCount ?? 0,
  };

  let expiringIdSet: Set<string> | null = null;
  if (expiring_within_days != null) {
    const cap = new Date(`${todayIST}T00:00:00+05:30`);
    cap.setDate(cap.getDate() + expiring_within_days);
    const capStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(cap);

    const { data: memRows } = await supabaseAdmin
      .from("memberships")
      .select("member_id")
      .gte("end_date", todayIST)
      .lte("end_date", capStr)
      .neq("status", "cancelled");
    expiringIdSet = new Set((memRows ?? []).map((r) => String(r.member_id)));
    if (expiringIdSet.size === 0) {
      return NextResponse.json({
        items: [],
        page,
        pageSize,
        total: 0,
        tab,
        tabCounts,
      });
    }
  }

  if (tab === "active_membership" && hasCurrentList.length === 0) {
    return NextResponse.json({
      items: [],
      page,
      pageSize,
      total: 0,
      tab,
      tabCounts,
    });
  }

  let listQuery = supabaseAdmin
    .from("members")
    .select(memberSelect, { count: "exact" })
    .order("created_at", { ascending: false });

  if (tab === "deactivated") {
    listQuery = listQuery.eq("is_active", false);
  } else {
    listQuery = listQuery.eq("is_active", true);
    if (tab === "active_membership") {
      listQuery = listQuery.in("id", hasCurrentList);
    } else if (tab === "expired" && hasCurrentList.length > 0) {
      listQuery = listQuery.not("id", "in", `(${hasCurrentList.join(",")})`);
    }
  }

  if (expiringIdSet && expiringIdSet.size > 0) {
    listQuery = listQuery.in("id", [...expiringIdSet]);
  }

  const qq = q?.trim();
  if (qq) {
    listQuery = listQuery.or(`full_name.ilike.%${qq}%,mobile.ilike.%${qq}%`);
  }

  const { data: pageRows, error: pageErr, count: listTotal } = await listQuery.range(from, to);

  if (pageErr) return internalServerError("Failed to load members");

  const rows = (pageRows ?? []) as MemberWithMemberships[];
  const bucket = process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";

  const items = await Promise.all(
    rows.map(async (m) => {
      const latest = pickLatestNonCancelledMembership(m.memberships);
      const end = latest?.end_date ?? null;
      let status: "active" | "expiring" | "expired" | "none" = "none";
      let daysLeft: number | null = null;
      if (end) {
        if (end < todayIST) {
          status = "expired";
          daysLeft = 0;
        } else {
          const diffDays = Math.ceil(
            (new Date(`${end}T00:00:00+05:30`).getTime() -
              new Date(`${todayIST}T00:00:00+05:30`).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          daysLeft = diffDays;
          status = diffDays <= 7 ? "expiring" : "active";
        }
      }
      let photo_signed_url: string | null = null;
      if (m.photo_url) {
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(String(m.photo_url), 60 * 60);
        photo_signed_url = signed?.signedUrl ?? null;
      }
      return {
        id: m.id,
        member_code: m.member_code,
        full_name: m.full_name,
        mobile: m.mobile,
        email: m.email,
        photo_url: m.photo_url,
        is_active: m.is_active,
        created_at: m.created_at,
        welcome_wa_sent: m.welcome_wa_sent,
        photo_signed_url,
        membership_plan_name: latest ? latest.plans?.[0]?.name ?? "Membership" : null,
        membership_end_date: end,
        membership_status: status,
        membership_days_left: daysLeft,
      };
    })
  );

  return NextResponse.json({
    items,
    page,
    pageSize,
    total: listTotal ?? 0,
    tab,
    tabCounts,
  });
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let member_code: string;
  try {
    member_code = await getNextMemberCode(supabaseAdmin);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unable to generate member code";
    return NextResponse.json(
      {
        error:
          "Member code generator is not configured. Ensure next_member_code() RPC and member_code_counter seed row exist.",
        details: msg,
      },
      { status: 503 }
    );
  }

  const insertPayload = {
    member_code,
    full_name: parsed.data.full_name,
    mobile: parsed.data.mobile,
    email: parsed.data.email?.trim() ? parsed.data.email.trim() : null,
    date_of_birth: parsed.data.date_of_birth ? parsed.data.date_of_birth : null,
    gender: parsed.data.gender ?? null,
    address: parsed.data.address ? parsed.data.address : null,
    blood_group: parsed.data.blood_group ?? null,
    joining_date: parsed.data.joining_date,
    notes: parsed.data.notes ? parsed.data.notes : null,
    is_active: true,
  };

  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .insert(insertPayload)
    .select("id, member_code, full_name, email")
    .single();

  if (dbError) return internalServerError("Failed to create member");

  // Welcome email (optional if email exists), duplicate-prevented via email_logs.
  const welcomeGuard = skipMemberEmailIfNoAddress({
    full_name: data.full_name,
    email: data.email,
  });
  if (!welcomeGuard.skipped) {
    const already = await hasSentEmail({
      supabaseAdmin,
      member_id: data.id,
      type: "welcome",
    });
    if (!already) {
      const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";
      const html = renderWelcomeEmail({
        gymName,
        memberName: data.full_name,
        memberCode: data.member_code,
        mobile: parsed.data.mobile,
      });
      const firstName = data.full_name.split(" ")[0] || data.full_name;
      await sendAndLog({
        supabaseAdmin,
        member_id: data.id,
        type: "welcome",
        to: welcomeGuard.to,
        subject: `Welcome to ${gymName}, ${firstName}! 🎉`,
        html,
      });
    }
  }

  return NextResponse.json({ id: data.id, member_code: data.member_code }, { status: 201 });
}

