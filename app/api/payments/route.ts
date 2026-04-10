import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createPaymentSchema } from "@/lib/validations/payment.schema";
import { getNextReceiptNumber } from "@/lib/receiptNumber";
import { hasSentEmail, sendAndLog } from "@/lib/email";
import { renderReceiptEmail } from "@/components/email/ReceiptEmail";
import { internalServerError } from "@/lib/apiError";
import { formatDateShortIST } from "@/lib/uiFormat";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const { page, pageSize } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error: dbError, count } = await supabaseAdmin
    .from("payments")
    .select(
      "id, membership_id, member_id, amount, payment_mode, payment_date, receipt_number, created_at",
      { count: "exact" }
    )
    .order("payment_date", { ascending: false })
    .range(from, to);

  if (dbError) return internalServerError("Failed to load payments");

  return NextResponse.json({
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // Load membership to get amount + member_id
  const { data: membership, error: memError } = await supabaseAdmin
    .from("memberships")
    .select("id, member_id, fee_charged, plan_id, start_date, end_date")
    .eq("id", parsed.data.membership_id)
    .single();

  if (memError || !membership) {
    return NextResponse.json({ error: "Invalid membership" }, { status: 400 });
  }

  // Enforce one payment per membership
  const { count: existingCount, error: existingError } = await supabaseAdmin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("membership_id", membership.id);

  if (existingError) {
    return internalServerError("Failed to validate existing payment");
  }
  if ((existingCount ?? 0) > 0) {
    return NextResponse.json({ error: "Payment already exists for this membership" }, { status: 409 });
  }

  const receipt_number = await getNextReceiptNumber(supabaseAdmin);

  const { data: created, error: createError } = await supabaseAdmin
    .from("payments")
    .insert({
      membership_id: membership.id,
      member_id: membership.member_id,
      amount: membership.fee_charged,
      payment_mode: parsed.data.payment_mode,
      upi_ref: parsed.data.upi_ref ? parsed.data.upi_ref : null,
      notes: parsed.data.notes ? parsed.data.notes : null,
      receipt_number,
      email_sent: false,
      created_by: user.id,
    })
    .select("id, receipt_number")
    .single();

  if (createError) {
    if ((createError as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "Payment already exists for this membership" },
        { status: 409 }
      );
    }
    return internalServerError("Failed to record payment");
  }

  // Receipt email (optional if member email exists), duplicate-prevented via email_logs.
  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, full_name, email")
    .eq("id", membership.member_id)
    .single();

  if (member?.email) {
    const already = await hasSentEmail({
      supabaseAdmin,
      member_id: member.id,
      type: "receipt",
      membership_id: membership.id,
    });

    if (!already) {
      const { data: plan } = await supabaseAdmin
        .from("plans")
        .select("name")
        .eq("id", membership.plan_id)
        .single();

      const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";
      const amountLabel = Number(membership.fee_charged ?? 0).toLocaleString("en-IN");
      const html = renderReceiptEmail({
        gymName,
        memberName: member.full_name,
        receiptNumber: receipt_number,
        amount: amountLabel,
        paymentMode: parsed.data.payment_mode,
        planName: plan?.name ?? "Membership",
        startDate: formatDateShortIST(String(membership.start_date)),
        endDate: formatDateShortIST(String(membership.end_date)),
        upiRef: parsed.data.upi_ref ? parsed.data.upi_ref : null,
      });

      const sent = await sendAndLog({
        supabaseAdmin,
        member_id: member.id,
        type: "receipt",
        to: member.email,
        subject: `Payment Receipt ${receipt_number} — ${gymName}`,
        html,
        membership_id: membership.id,
      });

      if (sent.ok) {
        await supabaseAdmin
          .from("payments")
          .update({ email_sent: true })
          .eq("id", created.id);
      }
    } else {
      await supabaseAdmin
        .from("payments")
        .update({ email_sent: true })
        .eq("id", created.id);
    }
  }

  return NextResponse.json({ id: created.id, receipt_number: created.receipt_number }, { status: 201 });
}

