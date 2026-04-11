import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendAndLog } from "@/lib/email";
import { renderReceiptEmail } from "@/components/email/ReceiptEmail";
import { formatAmountINR, formatDateShortIST } from "@/lib/uiFormat";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const params = await ctx.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: payment, error: payError } = await supabaseAdmin
    .from("payments")
    .select("id, membership_id, member_id, amount, payment_mode, receipt_number")
    .eq("id", parsedParams.data.id)
    .single();

  if (payError || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("id, plan_id, start_date, end_date")
    .eq("id", payment.membership_id)
    .single();

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("name")
    .eq("id", membership?.plan_id ?? "")
    .single();

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, full_name, email")
    .eq("id", payment.member_id)
    .single();

  if (!member?.email) {
    return NextResponse.json({ error: "Member has no email address" }, { status: 400 });
  }

  const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";
  const html = renderReceiptEmail({
    gymName,
    memberName: member.full_name,
    receiptNumber: payment.receipt_number,
    amount: formatAmountINR(Number(payment.amount ?? 0)),
    paymentMode: payment.payment_mode,
    planName: plan?.name ?? "Membership",
    startDate: membership?.start_date ? formatDateShortIST(String(membership.start_date)) : "",
    endDate: membership?.end_date ? formatDateShortIST(String(membership.end_date)) : "",
  });

  const sent = await sendAndLog({
    supabaseAdmin,
    member_id: member.id,
    type: "receipt",
    to: member.email,
    subject: `Payment Receipt ${payment.receipt_number} — ${gymName}`,
    html,
    membership_id: payment.membership_id,
  });

  if (sent.ok) {
    await supabaseAdmin.from("payments").update({ email_sent: true }).eq("id", payment.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: sent.error }, { status: 500 });
}

