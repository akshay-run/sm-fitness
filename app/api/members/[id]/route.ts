import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { updateMemberSchema } from "@/lib/validations/member.schema";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const photoBucket =
    process.env.SUPABASE_MEMBER_PHOTO_BUCKET || "sm-fitness-member-photo";
  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("id", parsedParams.data.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 404 });

  let photoSignedUrl: string | null = null;
  if (data?.photo_url) {
    const { data: signed } = await supabaseAdmin.storage
      .from(photoBucket)
      .createSignedUrl(String(data.photo_url), 60 * 60);
    photoSignedUrl = signed?.signedUrl ?? null;
  }

  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: latestMembership } = await supabaseAdmin
    .from("memberships")
    .select("id, plan_id, fee_charged, start_date, end_date, status")
    .eq("member_id", parsedParams.data.id)
    .neq("status", "cancelled")
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: allMemberships } = await supabaseAdmin
    .from("memberships")
    .select("id, plan_id, fee_charged, start_date, end_date, status")
    .eq("member_id", parsedParams.data.id)
    .order("end_date", { ascending: false });

  const planIds = Array.from(new Set((allMemberships ?? []).map((m: any) => String(m.plan_id))));
  const { data: plans } = planIds.length
    ? await supabaseAdmin.from("plans").select("id, name").in("id", planIds)
    : { data: [] };
  const planMap = new Map((plans ?? []).map((p: any) => [String(p.id), p.name]));

  const membershipHistory = (allMemberships ?? []).map((m: any) => ({
    ...m,
    plan_name: planMap.get(String(m.plan_id)) ?? "Membership",
  }));

  const { data: plan } = latestMembership?.plan_id
    ? await supabaseAdmin
        .from("plans")
        .select("name")
        .eq("id", latestMembership.plan_id)
        .single()
    : { data: null };

  let membershipStatus: "active" | "expiring" | "expired" | "none" = "none";
  let daysLeft = 0;
  if (latestMembership?.end_date) {
    const end = String(latestMembership.end_date);
    if (end < todayIST) {
      membershipStatus = "expired";
      daysLeft = 0;
    } else {
      const diffDays = Math.ceil(
        (new Date(`${end}T00:00:00+05:30`).getTime() -
          new Date(`${todayIST}T00:00:00+05:30`).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      daysLeft = diffDays;
      membershipStatus = diffDays <= 7 ? "expiring" : "active";
    }
  }

  const { data: recentPayments } = await supabaseAdmin
    .from("payments")
    .select("id, receipt_number, amount, payment_date, payment_mode")
    .eq("member_id", parsedParams.data.id)
    .order("payment_date", { ascending: false })
    .limit(3);

  return NextResponse.json({
    member: data,
    photoSignedUrl,
    membershipSummary: latestMembership
      ? {
          plan_name: plan?.name ?? "Membership",
          fee_charged: Number(latestMembership.fee_charged ?? 0),
          start_date: latestMembership.start_date,
          end_date: latestMembership.end_date,
          status: membershipStatus,
          days_left: daysLeft,
        }
      : {
          plan_name: null,
          fee_charged: null,
          start_date: null,
          end_date: null,
          status: "none",
          days_left: 0,
        },
    recentPayments: recentPayments ?? [],
    membershipHistory,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsedBody = updateMemberSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsedBody.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {
    ...parsedBody.data,
    email: parsedBody.data.email === "" ? null : parsedBody.data.email,
    date_of_birth: parsedBody.data.date_of_birth === "" ? null : parsedBody.data.date_of_birth,
    address: parsedBody.data.address === "" ? null : parsedBody.data.address,
    blood_group: parsedBody.data.blood_group === "" ? null : parsedBody.data.blood_group,
    joining_date: parsedBody.data.joining_date === "" ? null : parsedBody.data.joining_date,
    notes: parsedBody.data.notes === "" ? null : parsedBody.data.notes,
  };

  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .update(patch)
    .eq("id", parsedParams.data.id)
    .select("id")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .update({ is_active: false })
    .eq("id", parsedParams.data.id)
    .select("id")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

