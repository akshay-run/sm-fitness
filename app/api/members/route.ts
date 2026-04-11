import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createMemberSchema } from "@/lib/validations/member.schema";
import { getNextMemberCode } from "@/lib/memberCode";
import { hasSentEmail, sendAndLog } from "@/lib/email";
import { renderWelcomeEmail } from "@/components/email/WelcomeEmail";
import { internalServerError } from "@/lib/apiError";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  is_active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  expiring_within_days: z.coerce.number().int().min(1).max(90).optional(),
});

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    is_active: url.searchParams.get("is_active") ?? undefined,
    expiring_within_days: url.searchParams.get("expiring_within_days") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { q, page, pageSize, is_active, expiring_within_days } = parsed.data;
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

  let memberIdsFilter: string[] | null = null;
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
    memberIdsFilter = [...new Set((memRows ?? []).map((r) => String(r.member_id)))];
    if (memberIdsFilter.length === 0) {
      return NextResponse.json({
        items: [],
        page,
        pageSize,
        total: 0,
      });
    }
  }

  let query = supabaseAdmin
    .from("members")
    .select(
      "id, member_code, full_name, mobile, email, photo_url, is_active, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (typeof is_active === "boolean") query = query.eq("is_active", is_active);
  if (memberIdsFilter) query = query.in("id", memberIdsFilter);
  if (q && q.trim()) {
    const qq = q.trim();
    query = query.or(`full_name.ilike.%${qq}%,mobile.ilike.%${qq}%`);
  }

  const { data, error: dbError, count } = await query.range(from, to);
  if (dbError) return internalServerError("Failed to load members");

  const items = (data ?? []) as Array<{
    id: string;
    member_code: string;
    full_name: string;
    mobile: string;
    email: string | null;
    photo_url: string | null;
    is_active: boolean;
    created_at: string;
  }>;

  const memberIds = items.map((m) => m.id);
  const { data: memberships } = memberIds.length
    ? await supabaseAdmin
        .from("memberships")
        .select("member_id, plan_id, end_date, status")
        .in("member_id", memberIds)
        .neq("status", "cancelled")
        .order("end_date", { ascending: false })
    : { data: [] as Array<{ member_id: string; plan_id: string; end_date: string; status: string }> };

  const planIds = Array.from(new Set((memberships ?? []).map((m) => String(m.plan_id))));
  const { data: plans } = planIds.length
    ? await supabaseAdmin.from("plans").select("id, name").in("id", planIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const planMap = new Map((plans ?? []).map((p) => [String(p.id), p.name]));

  const latestMembershipMap = new Map<string, { plan_id: string; end_date: string }>();
  for (const m of memberships ?? []) {
    if (!latestMembershipMap.has(String(m.member_id))) {
      latestMembershipMap.set(String(m.member_id), {
        plan_id: String(m.plan_id),
        end_date: String(m.end_date),
      });
    }
  }

  return NextResponse.json({
    items: await Promise.all(
      items.map(async (m) => {
        const latest = latestMembershipMap.get(m.id);
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
          const bucket = process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";
          const { data: signed } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(String(m.photo_url), 60 * 60);
          photo_signed_url = signed?.signedUrl ?? null;
        }
        return {
          ...m,
          photo_signed_url,
          membership_plan_name: latest ? planMap.get(latest.plan_id) ?? "Membership" : null,
          membership_end_date: end,
          membership_status: status,
          membership_days_left: daysLeft,
        };
      })
    ),
    page,
    pageSize,
    total: count ?? 0,
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
    email: parsed.data.email,
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
  if (data.email) {
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
        to: data.email,
        subject: `Welcome to ${gymName}, ${firstName}! 🎉`,
        html,
      });
    }
  }

  return NextResponse.json({ id: data.id, member_code: data.member_code }, { status: 201 });
}

