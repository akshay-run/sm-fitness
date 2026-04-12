"use client";

import { useEffect, useMemo, useOptimistic, useState, startTransition } from "react";
import { toast } from "sonner";
import type { ZodIssue } from "zod";
import { UPIQRModal } from "@/components/payments/UPIQRModal";
import { paymentFormSchema } from "@/lib/validations/payment.schema";

function mapIssuesToFields(issues: ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0];
    if (typeof k === "string" && out[k] === undefined) out[k] = i.message;
  }
  return out;
}

function inputClass(invalid: boolean): string {
  return [
    "w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    invalid
      ? "border-red-400 bg-red-50 focus:border-red-400 focus-visible:ring-red-200"
      : "border-zinc-200 focus:border-zinc-400 focus-visible:ring-zinc-400",
  ].join(" ");
}

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
  const [cashRecording, setCashRecording] = useOptimistic(false, (_prev, next: boolean) => next);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [upiConfigError, setUpiConfigError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsUpi, setSettingsUpi] = useState<string | null>(null);
  const [uploadedQrUrl, setUploadedQrUrl] = useState<string | null>(null);
  const [settingsGymName, setSettingsGymName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || cancelled) return;
        if (json.upi_id) setSettingsUpi(String(json.upi_id));
        if (json.upi_qr_signed_url) setUploadedQrUrl(String(json.upi_qr_signed_url));
        if (json.gym_name) setSettingsGymName(String(json.gym_name));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upiId = settingsUpi || process.env.NEXT_PUBLIC_UPI_ID || "";
  const gymName = settingsGymName || process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS";

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
    setFieldErrors({});
    setUpiConfigError(null);
    setFormError(null);

    if (mode === "upi" && !upiId && !uploadedQrUrl) {
      setUpiConfigError("Configure UPI ID or upload a UPI QR in Settings.");
      return;
    }

    const parsed = paymentFormSchema.safeParse({
      payment_mode: mode,
      upi_ref: upiRef,
      notes,
    });
    if (!parsed.success) {
      setFieldErrors(mapIssuesToFields(parsed.error.issues));
      return;
    }

    const isCash = parsed.data.payment_mode === "cash";
    if (isCash) {
      startTransition(() => {
        setCashRecording(true);
      });
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
      toast.success("Payment recorded. Receipt sent by email ✓");
      onCreated(json.id);
    } catch (err: unknown) {
      if (isCash) {
        toast.error("Something went wrong. Please try again.");
      }
      setFormError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
      if (isCash) {
        startTransition(() => {
          setCashRecording(false);
        });
      }
    }
  }

  const fe = fieldErrors;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Add payment</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Member: <span className="font-medium text-zinc-900">{memberName}</span> •
          Amount: <span className="font-medium text-zinc-900">₹{amount}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          One payment per membership. No partial payments.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("cash");
              setUpiConfigError(null);
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              mode === "cash"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
            disabled={submitting || cashRecording}
          >
            Cash
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("upi");
              setUpiConfigError(null);
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              mode === "upi"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
            disabled={submitting || cashRecording}
          >
            UPI (QR)
          </button>
        </div>

        {mode === "upi" ? (
          <div className="space-y-2">
            <div className="text-xs text-zinc-600">
              QR shown for amount ₹{amount}. After payment, click “Confirm payment”.
            </div>
            {upiConfigError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {upiConfigError}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="upi_ref">
                  UPI Ref / UTR (optional)
                </label>
                <input
                  id="upi_ref"
                  aria-invalid={!!fe.upi_ref}
                  className={inputClass(!!fe.upi_ref)}
                  value={upiRef}
                  onChange={(e) => {
                    setUpiRef(e.target.value);
                    if (fe.upi_ref) setFieldErrors((p) => ({ ...p, upi_ref: "" }));
                  }}
                  disabled={submitting || cashRecording}
                />
                {fe.upi_ref ? (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span aria-hidden>⚠</span> {fe.upi_ref}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-800" htmlFor="upi_notes">
                  Notes (optional)
                </label>
                <input
                  id="upi_notes"
                  aria-invalid={!!fe.notes}
                  className={inputClass(!!fe.notes)}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (fe.notes) setFieldErrors((p) => ({ ...p, notes: "" }));
                  }}
                  disabled={submitting || cashRecording}
                />
                {fe.notes ? (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span aria-hidden>⚠</span> {fe.notes}
                  </p>
                ) : null}
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
                aria-invalid={!!fe.notes}
                className={inputClass(!!fe.notes)}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (fe.notes) setFieldErrors((p) => ({ ...p, notes: "" }));
                }}
                disabled={submitting || cashRecording}
              />
              {fe.notes ? (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <span aria-hidden>⚠</span> {fe.notes}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {formError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || cashRecording}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting || cashRecording
            ? "Saving..."
            : mode === "upi"
              ? "Confirm payment"
              : "Confirm payment received"}
        </button>
      </form>

      <UPIQRModal
        open={qrOpen}
        upiUrl={upiUrl}
        uploadedQrUrl={uploadedQrUrl}
        onClose={() => setQrOpen(false)}
      />
    </div>
  );
}
