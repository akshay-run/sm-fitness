"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { formatAmountINR, formatDateShortIST } from "@/lib/uiFormat";

const PAGE_SIZE = 25;

type PaymentListItem = {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number;
  payment_mode: "cash" | "upi";
  payment_date: string;
  receipt_number: string;
  email_sent: boolean;
  created_at: string;
  members: { full_name: string; member_code: string } | null;
};

type PaymentsListResponse = {
  items: PaymentListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const membershipId = searchParams.get("membershipId") || "";

  const [items, setItems] = useState<PaymentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const page = Number(searchParams.get("page") || "1");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(PAGE_SIZE));
    return sp.toString();
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/payments?${query}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as PaymentsListResponse & { error?: string };
        if (!res.ok) throw new Error(json?.error ?? "Failed to load payments");
        if (!cancelled) {
          setItems(json.items ?? []);
          setTotal(json.total ?? 0);
        }
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goPage = useCallback(
    (next: number) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("page", String(Math.max(1, Math.min(totalPages, next))));
      sp.set("pageSize", String(PAGE_SIZE));
      router.push(`/payments?${sp.toString()}`);
    },
    [router, searchParams, totalPages]
  );

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
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

      <div className="card-surface mt-8 overflow-hidden rounded-xl border border-zinc-200">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Member</div>
          <div className="col-span-2">Mode</div>
          <div className="col-span-2">Amount</div>
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
              <div className="col-span-3 font-medium">{formatDateShortIST(p.payment_date)}</div>
              <div className="col-span-3 truncate text-zinc-800">
                {p.members?.full_name ?? "—"}
                <span className="mt-0.5 block truncate text-xs text-zinc-500">
                  {p.members?.member_code ?? ""}
                </span>
              </div>
              <div className="col-span-2 uppercase text-zinc-700">{p.payment_mode}</div>
              <div className="col-span-2">{formatAmountINR(p.amount)}</div>
              <div className="col-span-2 text-right">
                <Link
                  href={`/payments/${p.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  →
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

      <div className="mt-6 flex items-center justify-between text-sm text-zinc-700">
        <div>
          Page {page} of {totalPages} • Total {total}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            className={[
              "rounded-lg border border-zinc-200 px-3 py-2",
              page <= 1 ? "opacity-50" : "hover:bg-zinc-50",
            ].join(" ")}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
            className={[
              "rounded-lg border border-zinc-200 px-3 py-2",
              page >= totalPages ? "opacity-50" : "hover:bg-zinc-50",
            ].join(" ")}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
