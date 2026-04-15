import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { PaymentsPageClient, type PaymentsListResponse } from "@/components/payments/PaymentsPageClient";

const PAGE_SIZE = 25;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, count } = await supabaseAdmin
    .from("payments")
    .select(
      `
      id,
      membership_id,
      member_id,
      amount,
      payment_mode,
      payment_date,
      receipt_number,
      email_sent,
      created_at,
      members ( full_name, member_code )
    `,
      { count: "exact" }
    )
    .order("payment_date", { ascending: false })
    .range(from, to);

  const items = (data ?? []).map((row) => {
    const memberRaw = (row as { members?: { full_name: string; member_code: string }[] | { full_name: string; member_code: string } | null }).members ?? null;
    const member = Array.isArray(memberRaw) ? memberRaw[0] ?? null : memberRaw;
    return {
      id: String((row as { id: string }).id),
      membership_id: String((row as { membership_id: string }).membership_id),
      member_id: String((row as { member_id: string }).member_id),
      amount: Number((row as { amount: number | string | null }).amount ?? 0),
      payment_mode: String((row as { payment_mode: string }).payment_mode) as "cash" | "upi",
      payment_date: String((row as { payment_date: string }).payment_date),
      receipt_number: String((row as { receipt_number: string }).receipt_number),
      email_sent: Boolean((row as { email_sent: boolean }).email_sent),
      created_at: String((row as { created_at: string }).created_at),
      members: member
        ? {
            full_name: String(member.full_name ?? ""),
            member_code: String(member.member_code ?? ""),
          }
        : null,
    };
  });

  const initialPayments: PaymentsListResponse = {
    items,
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
  };

  return <PaymentsPageClient initialPayments={initialPayments} />;
}