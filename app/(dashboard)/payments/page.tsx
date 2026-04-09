"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentForm } from "@/components/payments/PaymentForm";

type PaymentListItem = {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number;
  payment_mode: "cash" | "upi";
  payment_date: string;
  receipt_number: string;
  created_at: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const membershipId = searchParams.get("membershipId") || "";

  const [items, setItems] = useState<PaymentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const page = Number(searchParams.get("page") || "1");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", "20");
    return sp.toString();
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/payments?${query}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load payments");
        if (!cancelled) setItems(json.items ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!membershipId) return;
      try {
        const memRes = await fetch(`/api/memberships/${membershipId}`, { cache: "no-store" });
        const memJson = await memRes.json().catch(() => ({}));
        if (!memRes.ok) throw new Error(memJson?.error ?? "Failed to load membership");

        const memberRes = await fetch(`/api/members/${memJson.membership.member_id}`, {
          cache: "no-store",
        });
        const memberJson = await memberRes.json().catch(() => ({}));
        if (!memberRes.ok) throw new Error(memberJson?.error ?? "Failed to load member");

        if (!cancelled) {
          setAmount(Number(memJson.membership.fee_charged));
          setMemberName(memberJson.member.full_name);
        }
      } catch {
        // ignore; payment form will show errors on submit
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [membershipId]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Payments
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Payment history and receipts.</p>
        </div>
      </div>

      {membershipId ? (
        <div className="mt-6">
          <PaymentForm
            membershipId={membershipId}
            amount={amount}
            memberName={memberName || "—"}
            onCreated={(paymentId) => {
              router.replace(`/payments/${paymentId}`);
              router.refresh();
            }}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          To record a payment, open a member and create a membership, then come here with
          a membership id.
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600">
          <div className="col-span-4">Receipt</div>
          <div className="col-span-3">Mode</div>
          <div className="col-span-3">Amount</div>
          <div className="col-span-2 text-right">Open</div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-600">Loading...</div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-red-700">{error}</div>
        ) : items.length ? (
          items.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-zinc-900 hover:bg-zinc-50"
            >
              <div className="col-span-4 font-medium">{p.receipt_number}</div>
              <div className="col-span-3 uppercase text-zinc-700">{p.payment_mode}</div>
              <div className="col-span-3">₹{p.amount}</div>
              <div className="col-span-2 text-right">
                <Link
                  href={`/payments/${p.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  Open
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-10 text-center text-sm text-zinc-600">
            No payments yet.
          </div>
        )}
      </div>
    </div>
  );
}

