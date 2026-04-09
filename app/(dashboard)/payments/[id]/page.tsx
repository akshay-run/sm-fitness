"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReceiptPrint } from "@/components/payments/ReceiptPrint";

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

type Member = { id: string; full_name: string; member_code: string };
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
  const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";

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

      <div className="mt-6 grid grid-cols-1 gap-4">
        <Card label="UPI Ref / UTR" value={payment.upi_ref ?? "—"} />
        <Card label="Email sent" value={payment.email_sent ? "Yes" : "No"} />
        <Card label="Notes" value={payment.notes ?? "—"} />
      </div>

      {info ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {info}
        </div>
      ) : null}

      <div className="mt-6 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
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
          {resending ? "Resending..." : "Resend receipt email"}
        </button>
      </div>

      {member && membership ? (
        <ReceiptPrint
          data={{
            gymName,
            receiptNumber: payment.receipt_number,
            paymentDate: payment.payment_date,
            memberName: member.full_name,
            memberCode: member.member_code,
            planName: plan?.name ?? "Membership",
            startDate: membership.start_date,
            endDate: membership.end_date,
            paymentMode: payment.payment_mode,
            amount: payment.amount,
            upiRef: payment.upi_ref,
          }}
        />
      ) : null}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

