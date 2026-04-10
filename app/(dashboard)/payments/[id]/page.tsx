"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatAmountINR, formatDateShortIST, formatDateTimeIST } from "@/lib/uiFormat";
import { receiptMessage, smsLink, whatsappLink } from "@/lib/messageTemplates";

type Payment = {
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
};

type Member = { id: string; full_name: string; member_code: string; mobile: string };
type Membership = { id: string; start_date: string; end_date: string };
type Plan = { name: string };

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const idPromise = useMemo(() => params, [params]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setInfo(null);
      const { id } = await idPromise;
      const res = await fetch(`/api/payments/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!cancelled) setError(json?.error ?? "Failed to load payment");
      } else {
        if (!cancelled) {
          setPayment(json.payment);
          setMember(json.member ?? null);
          setMembership(json.membership ?? null);
          setPlan(json.plan ?? null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [idPromise]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6 text-sm text-zinc-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!payment) return null;
  const planName = plan?.name ?? "Membership";
  const shareMessage = member && membership
    ? receiptMessage({
        name: member.full_name,
        receiptNo: payment.receipt_number,
        plan: planName,
        startDate: formatDateShortIST(membership.start_date),
        endDate: formatDateShortIST(membership.end_date),
        amount: Number(payment.amount),
        mode: payment.payment_mode.toUpperCase(),
      })
    : "";
  const badgeClass = payment.email_sent ? "status-success" : "status-warning";
  const badgeText = payment.email_sent ? "Receipt email sent ✓" : "Receipt email not sent yet";

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {payment.receipt_number}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Mode: <span className="font-medium">{payment.payment_mode}</span> • Amount:{" "}
            <span className="font-medium">₹{payment.amount}</span>
          </p>
        </div>
        <Link
          href="/payments"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 print:hidden"
        >
          Back
        </Link>
      </div>

      <div className={`mt-4 inline-flex rounded px-3 py-1 text-xs ${badgeClass}`}>{badgeText}</div>

      {info ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {info}
        </div>
      ) : null}

      <div className="card-surface mt-6 rounded-2xl border border-zinc-200 p-5">
        <div className="text-xl font-semibold text-[#1A1A2E]">SM FITNESS</div>
        <div className="text-sm text-slate-500">Payment Receipt</div>
        <div className="my-3 border-t border-zinc-200" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{payment.receipt_number}</span>
          <span>{formatDateTimeIST(payment.created_at)}</span>
        </div>
        <div className="my-3 border-t border-zinc-200" />
        <div className="flex items-center justify-between text-sm">
          <span>{member?.full_name ?? "-"}</span>
          <span>{member?.member_code ?? "-"}</span>
        </div>
        <div className="my-3 border-t border-zinc-200" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Plan</span><span>{planName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Duration</span><span>{membership ? `${formatDateShortIST(membership.start_date)} → ${formatDateShortIST(membership.end_date)}` : "-"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span>{formatAmountINR(payment.amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className="uppercase">{payment.payment_mode}</span></div>
          {payment.upi_ref ? <div className="flex justify-between"><span className="text-slate-500">UPI Ref</span><span>{payment.upi_ref}</span></div> : null}
          {payment.notes ? <div className="flex justify-between"><span className="text-slate-500">Notes</span><span>{payment.notes}</span></div> : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Print receipt
        </button>
        <button
          type="button"
          onClick={async () => {
            setResending(true);
            setError(null);
            setInfo(null);
            const res = await fetch(`/api/payments/${payment.id}/resend`, { method: "POST" });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              setError(j?.error ?? "Failed to resend receipt email");
            } else {
              setInfo("Receipt email resent successfully.");
            }
            setResending(false);
          }}
          disabled={resending}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
        >
          {resending ? "Resending..." : "📧 Resend email"}
        </button>
        {member ? (
          <>
            <a href={whatsappLink(member.mobile, shareMessage)} className="status-success rounded-lg px-4 py-2 text-sm">
              💬 WhatsApp
            </a>
            <a href={smsLink(member.mobile, shareMessage)} className="status-info rounded-lg px-4 py-2 text-sm">
              📱 SMS
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}

