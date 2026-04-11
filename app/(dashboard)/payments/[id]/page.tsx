"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatAmountINR, formatDateShortIST, formatDateTimeIST } from "@/lib/uiFormat";
import { receiptMessage, smsLink, whatsappLink } from "@/lib/messageTemplates";
import toast from "react-hot-toast";

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
type Settings = { gym_name: string; upi_qr_url?: string; logo_url?: string; address?: string; phone?: string; upi_id?: string; };

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
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
          setSettings(json.settings ?? null);
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
  const gymName = settings?.gym_name || "SM FITNESS";
  
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
    <div className="mx-auto w-full max-w-2xl p-6">
      <div className="flex items-start justify-between gap-4 print:hidden">
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
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
        >
          Back
        </Link>
      </div>

      <div className={`mt-4 inline-flex rounded px-3 py-1 text-xs print:hidden ${badgeClass}`}>{badgeText}</div>

      {/* Printable Receipt Area */}
      <div className="card-surface mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm p-0 print:border-none print:shadow-none">
        
        {/* Receipt Header */}
        <div className="bg-zinc-900 text-white p-6 pb-8 flex justify-between items-start">
          <div className="flex items-center gap-3">
             {settings?.logo_url && (
                <div className="w-12 h-12 relative bg-white rounded flex-shrink-0">
                   <Image src={settings.logo_url} alt="Logo" fill className="object-contain p-1 rounded" />
                </div>
             )}
             <div>
                <div className="text-xl font-bold tracking-tight">{gymName}</div>
                {settings?.address && <div className="text-xs text-zinc-400 mt-1 max-w-[200px]">{settings.address}</div>}
                {settings?.phone && <div className="text-xs text-zinc-400 mt-0.5">Ph: {settings.phone}</div>}
             </div>
          </div>
          <div className="text-right">
             <div className="text-sm font-medium text-zinc-300">RECEIPT</div>
             <div className="text-lg font-mono font-semibold text-white">#{payment.receipt_number}</div>
             <div className="text-xs text-zinc-400 mt-1">{formatDateShortIST(payment.payment_date)}</div>
          </div>
        </div>

        {/* Amount Area */}
        <div className="px-6 py-5 -mt-4 bg-white rounded-t-xl z-10 relative border-b border-zinc-100 flex justify-between items-end">
           <div>
             <div className="text-xs text-slate-500 font-medium">Billed To</div>
             <div className="text-lg font-semibold text-zinc-900 mt-1">{member?.full_name ?? "-"}</div>
             <div className="text-sm text-zinc-500">{member?.member_code} {member?.mobile ? `• ${member.mobile}` : ''}</div>
           </div>
           <div className="text-right">
             <div className="text-xs text-slate-500 font-medium mb-1">Amount Paid</div>
             <div className="text-3xl font-bold tracking-tight text-zinc-900">{formatAmountINR(payment.amount)}</div>
           </div>
        </div>

        {/* Details Area */}
        <div className="px-6 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs font-semibold text-zinc-500">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr>
                <td className="py-4">
                  <div className="font-semibold text-zinc-900">{planName}</div>
                  {membership && (
                     <div className="text-zinc-500 text-xs mt-1">Valid from {formatDateShortIST(membership.start_date)} to {formatDateShortIST(membership.end_date)}</div>
                  )}
                </td>
                <td className="py-4 text-right font-medium">{formatAmountINR(payment.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-8 flex justify-between items-end">
             <div className="space-y-1 text-sm text-zinc-600">
                <div className="flex gap-2"><span className="text-zinc-400 w-16">Mode:</span><span className="uppercase font-medium text-zinc-900">{payment.payment_mode}</span></div>
                {payment.upi_ref && <div className="flex gap-2"><span className="text-zinc-400 w-16">Ref Nos:</span><span className="font-medium text-zinc-900">{payment.upi_ref}</span></div>}
                <div className="flex gap-2"><span className="text-zinc-400 w-16">Date:</span><span>{formatDateTimeIST(payment.created_at)}</span></div>
             </div>

             {/* QR Code for UPI payments */}
             {payment.payment_mode === "upi" && settings?.upi_qr_url ? (
               <div className="text-center">
                 <div className="w-24 h-24 relative border border-zinc-200 p-1 mb-1 bg-white">
                   <Image src={settings.upi_qr_url} alt="Scan to pay" fill className="object-contain" />
                 </div>
                 {settings.upi_id && <div className="text-[10px] text-zinc-500 font-mono">{settings.upi_id}</div>}
               </div>
             ) : null}
          </div>
        </div>
        
        {/* Footer Area */}
        <div className="bg-zinc-50 px-6 py-4 text-center text-xs text-zinc-400 border-t border-zinc-200">
          This is a system generated digital receipt and does not require a signature.
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 print:hidden justify-center max-w-md mx-auto">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl flex-1 bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 shadow-sm"
        >
          🖨️ Print Receipt
        </button>
        <button
          type="button"
          onClick={async () => {
            setResending(true);
            const t = toast.loading("Sending email...");
            const res = await fetch(`/api/payments/${payment.id}/resend`, { method: "POST" });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j?.error ?? "Failed to resend receipt email", { id: t });
            } else {
              toast.success("Receipt email resent successfully.", { id: t });
            }
            setResending(false);
          }}
          disabled={resending}
          className="rounded-xl flex-1 border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 shadow-sm"
        >
          📧 Resend
        </button>
      </div>

      {member && (
        <div className="mt-3 flex flex-wrap gap-2 print:hidden justify-center max-w-md mx-auto">
            <a href={whatsappLink(member.mobile, shareMessage)} className="status-success flex-1 text-center rounded-xl px-4 py-3 text-sm border font-medium">
              💬 WhatsApp
            </a>
            <a href={smsLink(member.mobile, shareMessage)} className="status-info flex-1 text-center rounded-xl px-4 py-3 text-sm border font-medium">
              📱 SMS
            </a>
        </div>
      )}
    </div>
  );
}
