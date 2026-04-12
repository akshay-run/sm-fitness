"use client";

import { useEffect, useMemo, useOptimistic, useState, startTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatAmountINR, formatDateShortIST, formatDateTimeIST } from "@/lib/uiFormat";
import {
  receiptMessage,
  smsLink,
  welcomeMemberWhatsAppMessage,
  whatsappLink,
} from "@/lib/messageTemplates";

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

type Member = {
  id: string;
  full_name: string;
  member_code: string;
  mobile: string;
  welcome_wa_sent?: boolean;
};
type Membership = { id: string; start_date: string; end_date: string };
type Plan = { name: string };

type GymBranding = {
  gym_name: string;
  address: string | null;
  phone: string | null;
  logo_signed_url: string | null;
  whatsapp_group_link: string | null;
};

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
  const [gym, setGym] = useState<GymBranding | null>(null);
  const [welcomeWaSent, setWelcomeWaSent] = useState(false);
  const [displayWelcomeSent, setWelcomeSentOptimistic] = useOptimistic(
    welcomeWaSent,
    (_c, next: boolean) => next
  );

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
          const m = json.member ?? null;
          setMember(m);
          setWelcomeWaSent(m?.welcome_wa_sent === true);
          setMembership(json.membership ?? null);
          setPlan(json.plan ?? null);
          setGym(json.gym ?? null);
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

  const welcomeMessage =
    member && membership
      ? welcomeMemberWhatsAppMessage({
          fullName: member.full_name,
          memberCode: member.member_code,
          mobile: member.mobile,
          planName: planName,
          startDate: formatDateShortIST(membership.start_date),
          endDate: formatDateShortIST(membership.end_date),
          whatsappGroupLink: gym?.whatsapp_group_link ?? null,
        })
      : "";

  const showWelcomeWa =
    Boolean(member && membership && plan) && !displayWelcomeSent;

  async function markWelcomeSent(memberId: string) {
    startTransition(() => {
      setWelcomeSentOptimistic(true);
    });
    const res = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ welcome_wa_sent: true }),
    });
    if (res.ok) {
      setWelcomeWaSent(true);
    } else {
      startTransition(() => {
        setWelcomeSentOptimistic(false);
      });
      toast.error("Something went wrong. Please try again.");
    }
  }
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
        {gym?.logo_signed_url ? (
          <div className="mb-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gym.logo_signed_url}
              alt=""
              className="max-h-16 w-auto object-contain"
            />
          </div>
        ) : null}
        <div className="text-xl font-semibold text-[#1A1A2E]">{gym?.gym_name ?? "SM FITNESS"}</div>
        <div className="text-sm text-slate-500">Payment Receipt</div>
        {gym?.address ? (
          <div className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{gym.address}</div>
        ) : null}
        {gym?.phone ? (
          <div className="mt-1 text-xs text-slate-600">Phone: {gym.phone}</div>
        ) : null}
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

      <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[#1A1A2E] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Print receipt
        </button>
        {showWelcomeWa && member ? (
          <a
            href={whatsappLink(member.mobile, welcomeMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void markWelcomeSent(member.id);
            }}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
          >
            <WhatsAppGlyph className="h-4 w-4 shrink-0" />
            Send welcome on WhatsApp 👋
          </a>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            setResending(true);
            setError(null);
            setInfo(null);
            const res = await fetch(`/api/payments/${payment.id}/resend`, { method: "POST" });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(j?.error ?? "Email could not be sent. Check your Gmail settings.");
            } else if (j?.skipped) {
              setInfo("No email on file — receipt email was not sent.");
            } else {
              setInfo("Receipt resent ✓");
            }
            setResending(false);
          }}
          disabled={resending}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          {resending ? "Resending..." : "Resend email"}
        </button>
        {member ? (
          <>
            <a
              href={whatsappLink(member.mobile, shareMessage)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              WhatsApp
            </a>
            <a
              href={smsLink(member.mobile, shareMessage)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              SMS
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}

