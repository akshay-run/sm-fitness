import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getGymDisplay } from "@/lib/gymDisplay";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

type PaymentJoinRow = {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number;
  payment_mode: "cash" | "upi";
  payment_date: string;
  upi_ref: string | null;
  receipt_number: string;
  email_sent: boolean;
  notes: string | null;
  created_at: string;
  members:
    | {
        id: string;
        full_name: string;
        member_code: string;
        mobile: string;
        welcome_wa_sent: boolean | null;
      }
    | {
        id: string;
        full_name: string;
        member_code: string;
        mobile: string;
        welcome_wa_sent: boolean | null;
      }[]
    | null;
  memberships:
    | {
        id: string;
        plan_id: string;
        start_date: string;
        end_date: string;
        plans: { name: string } | { name: string }[] | null;
      }
    | {
        id: string;
        plan_id: string;
        start_date: string;
        end_date: string;
        plans: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: row, error: dbError } = await supabaseAdmin
    .from("payments")
    .select(
      `
      id,
      membership_id,
      member_id,
      amount,
      payment_mode,
      payment_date,
      upi_ref,
      receipt_number,
      email_sent,
      notes,
      created_at,
      members ( id, full_name, member_code, mobile, welcome_wa_sent ),
      memberships ( id, plan_id, start_date, end_date, plans ( name ) )
    `
    )
    .eq("id", parsedParams.data.id)
    .single();

  if (dbError || !row) return NextResponse.json({ error: dbError?.message ?? "Not found" }, { status: 404 });

  const r = row as PaymentJoinRow;
  const member = Array.isArray(r.members) ? r.members[0] ?? null : r.members ?? null;
  const membershipRow = Array.isArray(r.memberships) ? r.memberships[0] ?? null : r.memberships ?? null;
  const payment = {
    id: r.id,
    membership_id: r.membership_id,
    member_id: r.member_id,
    amount: r.amount,
    payment_mode: r.payment_mode,
    payment_date: r.payment_date,
    upi_ref: r.upi_ref,
    receipt_number: r.receipt_number,
    email_sent: r.email_sent,
    notes: r.notes,
    created_at: r.created_at,
  };
  const membership = membershipRow
    ? {
        id: membershipRow.id,
        plan_id: membershipRow.plan_id,
        start_date: membershipRow.start_date,
        end_date: membershipRow.end_date,
      }
    : null;
  const planName =
    membershipRow?.plans == null
      ? null
      : Array.isArray(membershipRow.plans)
        ? membershipRow.plans[0]?.name ?? null
        : membershipRow.plans.name ?? null;
  const plan = planName ? { name: planName } : null;

  const gym = await getGymDisplay(supabaseAdmin);

  return NextResponse.json({
    payment,
    member,
    membership,
    plan,
    gym,
  });
}
