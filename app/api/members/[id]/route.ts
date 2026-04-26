import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { updateMemberSchema } from "@/lib/validations/member.schema";
import { ageFromDateOfBirth } from "@/lib/memberAge";
import { getDaysRemaining, getMembershipStatusFromEndDate, todayISTDateString } from "@/lib/dateUtils";
import { internalServerError } from "@/lib/apiError";

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
  const memberId = parsedParams.data.id;
  const todayIST = todayISTDateString();

  // Fetch member first (needed for photo URL check)
  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .select(
      "id, member_code, full_name, mobile, email, photo_url, is_active, date_of_birth, gender, address, blood_group, joining_date, notes, created_at, welcome_wa_sent"
    )
    .eq("id", memberId)
    .single();

  if (dbError) {
    console.error("[GET /api/members/:id] member fetch", dbError);
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Parallelize all independent queries
  const [
    photoResult,
    { data: allMemberships },
    { data: activeMembershipsForPreview },
    { data: recentPayments },
  ] = await Promise.all([
    data?.photo_url
      ? supabaseAdmin.storage
          .from(photoBucket)
          .createSignedUrl(String(data.photo_url), 60 * 60)
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from("memberships")
      .select("id, plan_id, fee_charged, start_date, end_date, status")
      .eq("member_id", memberId)
      .order("end_date", { ascending: false }),
    supabaseAdmin
      .from("memberships")
      .select("end_date")
      .eq("member_id", memberId)
      .neq("status", "cancelled")
      .gte("end_date", todayIST)
      .order("end_date", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("payments")
      .select("id, receipt_number, amount, payment_date, payment_mode")
      .eq("member_id", memberId)
      .order("payment_date", { ascending: false })
      .limit(3),
  ]);

  const photoSignedUrl = photoResult?.data?.signedUrl ?? null;

  const latest_active_end_date =
    activeMembershipsForPreview?.[0]?.end_date != null
      ? String(activeMembershipsForPreview[0].end_date)
      : null;

  // Derive latest non-cancelled membership
  const nonCancelled = (allMemberships ?? []).filter(
    (m) => String(m.status) !== "cancelled"
  );
  const latestMembership = nonCancelled[0] ?? null; // already sorted desc by end_date

  // Batch-fetch plan names for membership history
  const histPlanIds = Array.from(
    new Set((allMemberships ?? []).map((m) => String(m.plan_id)))
  );
  const { data: histPlans } = histPlanIds.length
    ? await supabaseAdmin.from("plans").select("id, name").in("id", histPlanIds)
    : { data: [] as { id: string; name: string }[] };
  const histPlanMap = new Map((histPlans ?? []).map((p) => [String(p.id), p.name]));

  // Use centralised dateUtils for status calculation
  const endDateStr = latestMembership?.end_date
    ? String(latestMembership.end_date)
    : null;
  const statusFromUtils = getMembershipStatusFromEndDate(endDateStr);
  const daysLeft = endDateStr ? Math.max(0, getDaysRemaining(endDateStr)) : 0;
  const membershipStatus: "active" | "expiring" | "expired" | "none" =
    statusFromUtils === "no-plan"
      ? "none"
      : statusFromUtils === "expiring"
        ? "expiring"
        : statusFromUtils;

  const membershipHistory = (allMemberships ?? []).map((row) => ({
    id: row.id,
    plan_name: histPlanMap.get(String(row.plan_id)) ?? "Plan",
    fee_charged: Number(row.fee_charged ?? 0),
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
  }));

  const dob = data?.date_of_birth ? String(data.date_of_birth).slice(0, 10) : null;
  const ageYears = ageFromDateOfBirth(dob);

  return NextResponse.json({
    member: data,
    photoSignedUrl,
    ageYears,
    membershipHistory,
    membershipSummary: latestMembership
      ? {
          plan_name: histPlanMap.get(String(latestMembership.plan_id)) ?? "Membership",
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
    latest_active_end_date,
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
  const patch: Record<string, unknown> = {};
  const src = parsedBody.data;
  if (src.full_name !== undefined) patch.full_name = src.full_name;
  if (src.mobile !== undefined) patch.mobile = src.mobile;
  if (src.email !== undefined) patch.email = src.email === "" ? null : src.email;
  if (src.date_of_birth !== undefined) patch.date_of_birth = src.date_of_birth === "" ? null : src.date_of_birth;
  if (src.gender !== undefined) patch.gender = src.gender ?? null;
  if (src.address !== undefined) patch.address = src.address === "" ? null : src.address;
  if (src.blood_group !== undefined) patch.blood_group = src.blood_group ?? null;
  if (src.notes !== undefined) patch.notes = src.notes === "" ? null : src.notes;
  if (src.joining_date !== undefined) patch.joining_date = src.joining_date === "" ? null : src.joining_date;
  if (src.welcome_wa_sent !== undefined) patch.welcome_wa_sent = src.welcome_wa_sent;
  if (src.is_active !== undefined) patch.is_active = src.is_active;

  const { data, error: dbError } = await supabaseAdmin
    .from("members")
    .update(patch)
    .eq("id", parsedParams.data.id)
    .select("id")
    .single();

  if (dbError) {
    console.error("[PATCH /api/members/:id]", dbError);
    return internalServerError("Failed to update member");
  }
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

  if (dbError) {
    console.error("[DELETE /api/members/:id]", dbError);
    return internalServerError("Failed to archive member");
  }
  return NextResponse.json({ id: data.id });
}

