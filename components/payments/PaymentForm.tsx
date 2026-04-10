"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { UPIQRModal } from "@/components/payments/UPIQRModal";

const schema = z.object({
  payment_mode: z.enum(["cash", "upi"]),
  upi_ref: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export function PaymentForm({
  membershipId,
  amount,
  memberName,
  onCreated,
}: {
  membershipId: string;
  amount: number;
  memberName: string;
  onCreated: (paymentId: string) => void;
}) {
  const [mode, setMode] = useState<"cash" | "upi">("cash");
  const [upiRef, setUpiRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || "";
  const gymName = process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";

  const upiUrl = useMemo(() => {
    const pn = encodeURIComponent(gymName);
    const pa = encodeURIComponent(upiId);
    const am = encodeURIComponent(String(amount.toFixed(2)));
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
  }, [amount, gymName, upiId]);

  useEffect(() => {
    if (mode === "upi") setQrOpen(true);
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "upi" && !upiId) {
      setError("Missing NEXT_PUBLIC_UPI_ID in env");
      return;
    }

    const parsed = schema.safeParse({
      payment_mode: mode,
      upi_ref: upiRef,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          membership_id: membershipId,
          payment_mode: parsed.data.payment_mode,
          upi_ref: parsed.data.upi_ref,
          notes: parsed.data.notes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to record payment");
      onCreated(json.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Record payment</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Member: <span className="font-medium text-zinc-900">{memberName}</span> •
          Amount: <span className="font-medium text-zinc-900">₹{amount}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          One payment per membership. No partial payments.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("cash")}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              mode === "cash"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
            disabled={submitting}
          >
            Cash
          </button>
          <button
            type="button"
            onClick={() => setMode("upi")}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              mode === "upi"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
            disabled={submitting}
          >
            UPI (QR)
          </button>
        </div>

        {mode === "upi" ? (
          <div className="space-y-2">
            <div className="text-xs text-zinc-600">
              QR shown for amount ₹{amount}. After payment, click “Confirm payment”.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="upi_ref">
                  UPI Ref / UTR (optional)
                </label>
                <input
                  id="upi_ref"
                  aria-invalid={!!error}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="upi_notes">
                  Notes (optional)
                </label>
                <input
                  id="upi_notes"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-800" htmlFor="cash_notes">
                Notes (optional)
              </label>
              <input
                id="cash_notes"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Saving..." : mode === "upi" ? "Confirm payment" : "Mark as paid"}
        </button>
      </form>

      <UPIQRModal open={qrOpen} upiUrl={upiUrl} onClose={() => setQrOpen(false)} />
    </div>
  );
}

